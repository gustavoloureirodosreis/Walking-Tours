"""Application configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# SAM 3 Configuration
_raw_prompts = os.environ.get("SAM3_PROMPTS", "men,women")
SAM3_PROMPTS = tuple(
    prompt.strip() for prompt in _raw_prompts.split(",") if prompt.strip()
) or ("men", "women")
SAM3_DEVICE = os.environ.get("SAM3_DEVICE")
SAM3_CONFIDENCE_THRESHOLD = float(
    os.environ.get("SAM3_CONFIDENCE_THRESHOLD", "0.25")
)

# Video Processing Configuration
FRAME_INTERVAL_SECONDS = float(os.environ.get("FRAME_INTERVAL_SECONDS", "1"))
MOTION_THRESHOLD = float(os.environ.get("MOTION_THRESHOLD", "15"))

# Cache Configuration
CACHE_DIR = Path("cache")
CACHE_DIR.mkdir(exist_ok=True)
CACHE_VERSION = os.environ.get("CACHE_VERSION", "sam3_v1")

