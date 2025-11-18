from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import cv2
import numpy as np
import tempfile
import os
from inference import get_model
import supervision as sv
from typing import List, Dict

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Inference Client for Hosted API (Free Plan Friendly)
# Using the hosted API avoids downloading weights locally, which is restricted on free plans.
from inference_sdk import InferenceHTTPClient

# Initialize client - works with free plan by running on Roboflow servers
CLIENT = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key=os.environ.get("ROBOFLOW_API_KEY")
)

import hashlib
import json
import pandas as pd
from pathlib import Path
from pydantic import BaseModel
import yt_dlp

# Initialize Inference Client
# ... (rest of imports)

CACHE_DIR = Path("cache")
CACHE_DIR.mkdir(exist_ok=True)

class YouTubeRequest(BaseModel):
    url: str

def get_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def process_video_analysis(file_path: str, api_key: str) -> List[Dict]:
    """Shared logic to hash, check cache, and analyze video."""
    CLIENT.api_key = api_key

    # 1. Calculate Hash to check cache
    print("Calculating video hash...")
    file_hash = get_file_hash(file_path)
    print(f"Video Hash: {file_hash}")

    cache_file = CACHE_DIR / f"{file_hash}.csv"

    # 2. Check Cache
    if cache_file.exists():
        print(f"Cache found! Loading results from {cache_file}")
        df = pd.read_csv(cache_file)
        return df.to_dict(orient="records")

    # 3. Run Analysis (if not cached)
    print("No cache found. Starting analysis...")
    video_info = sv.VideoInfo.from_video_path(file_path)

    timeline = []

    # Process 1 frame every 2 seconds
    fps = video_info.fps
    stride = int(fps * 2)
    if stride < 1: stride = 1

    total_frames = video_info.total_frames
    print(f"Analysis config: {total_frames} frames total. FPS: {fps}. Stride: {stride} frames (every 2s)")

    frame_generator = sv.get_video_frames_generator(file_path)

    for i, frame in enumerate(frame_generator):
        if i % stride != 0:
            continue

        if i % (stride * 10) == 0:
            print(f"Processing frame {i}/{total_frames} ({int(i/total_frames*100)}%)")

        # Using "coco/3" (YOLOv8) as it is the reliable hosted SOTA for Free Plans.
        result = CLIENT.infer(frame, model_id="coco/3")

        detections = sv.Detections.from_inference(result)
        detections = detections[detections.class_id == 0] # Filter person

        timestamp = i / video_info.fps

        timeline.append({
            "timestamp": float(f"{timestamp:.2f}"),
            "count": len(detections)
        })

    # 4. Save to Cache (CSV)
    print(f"Analysis complete. Saving results to {cache_file}")
    df = pd.DataFrame(timeline)
    df.to_csv(cache_file, index=False)

    return timeline

@app.post("/analyze_youtube")
async def analyze_youtube(request: YouTubeRequest) -> List[Dict]:
    # Check API Key
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ROBOFLOW_API_KEY not set")

    temp_path = None
    try:
        print(f"Downloading YouTube video: {request.url}")
        # Create a temp directory for download
        with tempfile.TemporaryDirectory() as temp_dir:
            # yt-dlp options
            ydl_opts = {
                'format': 'best[ext=mp4]/best', # Prefer MP4 for cv2 compatibility
                'outtmpl': os.path.join(temp_dir, '%(id)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(request.url, download=True)
                filename = ydl.prepare_filename(info)
                temp_path = filename

            print(f"Download complete: {temp_path}")

            # Use shared analysis logic
            return process_video_analysis(temp_path, api_key)

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"YouTube Analysis Error: {error_details}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze_video")
async def analyze_video(file: UploadFile = File(...)) -> List[Dict]:
    if not file.filename.endswith(('.mp4', '.avi', '.mov')):
        raise HTTPException(status_code=400, detail="Invalid file format")

    # Check API Key
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ROBOFLOW_API_KEY not set")

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        return process_video_analysis(temp_path, api_key)

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Analysis Error: {error_details}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

