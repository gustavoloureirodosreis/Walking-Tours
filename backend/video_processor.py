"""Video processing and analysis logic."""
import cv2
import numpy as np
import supervision as sv
from typing import Generator, Dict, Any

from config import FRAME_INTERVAL_SECONDS, MOTION_THRESHOLD
from sam3_service import Sam3Analyzer

def determine_stride(fps: float) -> int:
    """Calculate frame stride based on sampling interval."""
    return max(1, int(fps * FRAME_INTERVAL_SECONDS))

def has_significant_motion(current_frame, previous_frame) -> bool:
    """Detect significant motion between frames using frame differencing."""
    if previous_frame is None:
        return True

    gray_current = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)
    gray_previous = cv2.cvtColor(previous_frame, cv2.COLOR_BGR2GRAY)
    diff = cv2.absdiff(gray_current, gray_previous)
    score = float(np.mean(diff))

    return score >= MOTION_THRESHOLD

def analyze_video_frames(
    file_path: str,
    analyzer: Sam3Analyzer,
) -> Generator[Dict[str, Any], None, None]:
    """
    Analyze video frames and yield timeline data points.

    Yields dictionaries with timestamp and count.
    """
    video_info = sv.VideoInfo.from_video_path(file_path)
    fps = video_info.fps
    stride = determine_stride(fps)

    frame_generator = sv.get_video_frames_generator(file_path)
    previous_frame = None
    last_counts = {"men": 0, "women": 0, "total": 0}

    for i, frame in enumerate(frame_generator):
        if i % stride != 0:
            continue

        timestamp = i / fps
        motion_detected = has_significant_motion(frame, previous_frame)
        previous_frame = frame

        if motion_detected:
            predictions = analyzer.analyze_frame(frame)

            def _count_for(*keys: str) -> int:
                for key in keys:
                    if key in predictions:
                        return int(predictions[key])
                return 0

            men = _count_for("men", "man")
            women = _count_for("women", "woman")
            total = predictions.get("total")
            total_count = int(total) if total is not None else men + women
            last_counts = {"men": men, "women": women, "total": total_count}

        yield {
            "timestamp": float(f"{timestamp:.2f}"),
            "men": last_counts["men"],
            "women": last_counts["women"],
            "total": last_counts["total"],
            "frame_index": i,
            "total_frames": video_info.total_frames
        }

