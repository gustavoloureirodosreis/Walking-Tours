"""Utilities for running SAM 3 locally for frame-level analysis."""
from __future__ import annotations

import sys
import threading
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, Tuple

import numpy as np
from PIL import Image
import logging

# Ensure the local SAM3 repo (external/sam3) is importable before touching torch.
SAM3_REPO_PATH = (
    Path(__file__).resolve().parent.parent / "external" / "sam3"
)
if SAM3_REPO_PATH.exists() and str(SAM3_REPO_PATH) not in sys.path:
    sys.path.insert(0, str(SAM3_REPO_PATH))

try:  # pragma: no cover - optional dependency
    import triton  # type: ignore
except ImportError:  # pragma: no cover
    import types

    def _jit(fn=None, **_kwargs):
        if fn is None:
            def decorator(inner):
                return inner
            return decorator
        return fn

    def _unsupported(*_args, **_kwargs):
        raise RuntimeError(
            "triton operations are unavailable on this platform. "
            "Use a GPU build if you need tracker distance transforms."
        )

    triton_stub = types.ModuleType("triton")
    triton_stub.jit = _jit  # type: ignore[attr-defined]
    lang_stub = types.ModuleType("triton.language")
    lang_stub.program_id = _unsupported  # type: ignore[attr-defined]
    lang_stub.load = _unsupported  # type: ignore[attr-defined]
    lang_stub.store = _unsupported  # type: ignore[attr-defined]
    lang_stub.constexpr = lambda *args, **kwargs: None  # type: ignore[attr-defined]
    lang_stub.dtype = object()  # type: ignore[attr-defined]
    triton_stub.language = lang_stub  # type: ignore[attr-defined]
    sys.modules["triton"] = triton_stub
    sys.modules["triton.language"] = lang_stub

try:  # pragma: no cover
    import decord  # type: ignore
except ImportError:
    import types as _types

    def _decord_unavailable(*_args, **_kwargs):
        raise RuntimeError(
            "Decord is unavailable on this platform. Install it if you need SAM3 video utilities."
        )

    decord_stub = _types.ModuleType("decord")
    decord_stub.VideoReader = _decord_unavailable  # type: ignore[attr-defined]
    decord_stub.bridge = _types.SimpleNamespace(set_bridge=_decord_unavailable)  # type: ignore[attr-defined]
    decord_stub.cpu = _decord_unavailable  # type: ignore[attr-defined]
    sys.modules["decord"] = decord_stub

try:  # pragma: no cover - import guard
    import torch
except ImportError as exc:  # pragma: no cover
    raise RuntimeError(
        "PyTorch is required for SAM3. Please install torch/torchvision/torchaudio "
        "before starting the backend (see backend/SAM3_SETUP.md)."
    ) from exc

from config import (
    SAM3_CONFIDENCE_THRESHOLD,
    SAM3_DEVICE,
    SAM3_PROMPTS,
)


class Sam3InitializationError(RuntimeError):
    """Raised when SAM 3 cannot be initialized."""


class Sam3InferenceError(RuntimeError):
    """Raised when SAM 3 fails to run inference on a frame."""


def _sanitize_prompt(prompt: str) -> str:
    return "_".join(prompt.lower().split())


class Sam3Analyzer:
    """Thin wrapper around SAM 3 image predictor for counting prompts per frame."""

    def __init__(
        self,
        prompts: Iterable[str] | None = None,
        confidence_threshold: float = SAM3_CONFIDENCE_THRESHOLD,
        device_hint: str | None = SAM3_DEVICE,
    ) -> None:
        try:
            from sam3.model_builder import build_sam3_image_model
            from sam3.model.sam3_image_processor import Sam3Processor
        except ImportError as exc:  # pragma: no cover - import guard
            raise Sam3InitializationError(
                "SAM3 dependencies are missing. "
                f"Missing module: {exc}."
            ) from exc

        self.prompts = tuple(prompts or SAM3_PROMPTS)
        self.prompt_keys: Tuple[str, ...] = tuple(_sanitize_prompt(p) for p in self.prompts)
        if not self.prompts:
            raise Sam3InitializationError("SAM3_PROMPTS must include at least one prompt.")

        if device_hint and device_hint not in {"auto", ""}:
            self.device = device_hint
        else:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            if self.device == "cuda" and not torch.cuda.is_available():
                self.device = "cpu"
        print(f"[SAM3] initializing on device={self.device}")
        logging.getLogger(__name__).info("SAM3 initializing on device=%s", self.device)

        try:
            self.model = build_sam3_image_model(device=self.device)
        except Exception as exc:  # pragma: no cover - relies on HF auth
            import traceback
            traceback.print_exc()
            raise Sam3InitializationError(
                "Unable to load SAM3 weights. Ensure you have accepted access on "
                "Hugging Face and run `hf auth login` before starting the backend. "
                f"Details: {exc}"
            ) from exc

        self.model.to(self.device)
        self.model.eval()
        self.processor = Sam3Processor(
            self.model,
            device=self.device,
            confidence_threshold=confidence_threshold,
        )
        self._lock = threading.Lock()

    def analyze_frame(self, frame: np.ndarray) -> Dict[str, int]:
        """Return prompt counts for a single BGR frame."""
        if frame is None:
            raise Sam3InferenceError("Received empty frame.")

        if frame.dtype != np.uint8:
            frame = frame.astype(np.uint8)

        # Convert BGR (OpenCV) -> RGB for PIL
        rgb_frame = frame[..., ::-1]
        image = Image.fromarray(rgb_frame)

        try:
            with self._lock:
                state = self.processor.set_image(image, state={})
                counts: Dict[str, int] = {}
                for prompt, key in zip(self.prompts, self.prompt_keys):
                    state = self.processor.set_text_prompt(prompt=prompt, state=state)
                    scores = state.get("scores")
                    if scores is None:
                        counts[key] = 0
                    elif hasattr(scores, "shape"):
                        counts[key] = int(scores.shape[0])
                    else:
                        counts[key] = len(scores)
                    self.processor.reset_all_prompts(state)
                return counts
        except Sam3InferenceError:
            raise
        except Exception as exc:  # pragma: no cover - heavy stack
            raise Sam3InferenceError(str(exc)) from exc


@lru_cache(maxsize=1)
def get_sam3_service() -> Sam3Analyzer:
    """Return a cached Sam3Analyzer instance."""
    return Sam3Analyzer()

