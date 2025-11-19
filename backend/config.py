"""Application configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Roboflow Configuration
ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY")
ROBOFLOW_MODEL_ID = os.environ.get("ROBOFLOW_MODEL_ID", "people-detection-o4rdr/1")
ROBOFLOW_API_URL = "https://detect.roboflow.com"

# Video Processing Configuration
FRAME_INTERVAL_SECONDS = float(os.environ.get("FRAME_INTERVAL_SECONDS", "1"))
MOTION_THRESHOLD = float(os.environ.get("MOTION_THRESHOLD", "15"))

# Cache Configuration
CACHE_DIR = Path("cache")
CACHE_DIR.mkdir(exist_ok=True)

