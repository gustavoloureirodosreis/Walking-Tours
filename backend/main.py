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
import asyncio
from fastapi.responses import StreamingResponse

# ... imports

CACHE_DIR = Path("cache")
CACHE_DIR.mkdir(exist_ok=True)

class YouTubeRequest(BaseModel):
    url: str

def get_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

async def process_video_analysis_stream(file_path: str, api_key: str):
    """Generator that yields progress updates and final result."""
    CLIENT.api_key = api_key

    # 1. Calculate Hash
    yield json.dumps({"status": "hashing", "progress": 0}) + "\n"
    file_hash = get_file_hash(file_path)
    cache_file = CACHE_DIR / f"{file_hash}.csv"

    # 2. Check Cache
    if cache_file.exists():
        yield json.dumps({"status": "cached", "progress": 100}) + "\n"
        df = pd.read_csv(cache_file)
        result = df.to_dict(orient="records")
        yield json.dumps({"status": "complete", "data": result}) + "\n"
        return

    # 3. Run Analysis
    yield json.dumps({"status": "analyzing", "progress": 0}) + "\n"
    video_info = sv.VideoInfo.from_video_path(file_path)

    timeline = []
    fps = video_info.fps
    stride = int(fps * 2)
    if stride < 1: stride = 1
    total_frames = video_info.total_frames

    frame_generator = sv.get_video_frames_generator(file_path)

    for i, frame in enumerate(frame_generator):
        if i % stride != 0:
            continue

        # Yield progress update
        if i % (stride * 5) == 0: # Update every 5 strides (~10s video time)
            progress = int((i / total_frames) * 100)
            yield json.dumps({"status": "analyzing", "progress": progress}) + "\n"
            # Small sleep to allow event loop to process other things if needed
            await asyncio.sleep(0)

        result = CLIENT.infer(frame, model_id="coco/3")
        detections = sv.Detections.from_inference(result)
        detections = detections[detections.class_id == 0]

        timestamp = i / fps
        timeline.append({
            "timestamp": float(f"{timestamp:.2f}"),
            "count": len(detections)
        })

    # 4. Save to Cache
    df = pd.DataFrame(timeline)
    df.to_csv(cache_file, index=False)

    yield json.dumps({"status": "complete", "data": timeline}) + "\n"

@app.post("/analyze_youtube_stream")
async def analyze_youtube_stream(request: YouTubeRequest):
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ROBOFLOW_API_KEY not set")

    async def event_generator():
        temp_path = None
        try:
            yield json.dumps({"status": "downloading", "progress": 0}) + "\n"

            with tempfile.TemporaryDirectory() as temp_dir:
                ydl_opts = {
                    'format': 'best[ext=mp4]/best',
                    'outtmpl': os.path.join(temp_dir, '%(id)s.%(ext)s'),
                    'quiet': True,
                    'no_warnings': True
                }

                # yt-dlp is synchronous, run in thread pool to not block async loop
                loop = asyncio.get_event_loop()
                def download():
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(request.url, download=True)
                        return ydl.prepare_filename(info)

                temp_path = await loop.run_in_executor(None, download)

                async for event in process_video_analysis_stream(temp_path, api_key):
                    yield event

        except Exception as e:
            yield json.dumps({"status": "error", "error": str(e)}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")

# Legacy endpoint (kept for backward compat if needed, or remove)
@app.post("/analyze_youtube")
async def analyze_youtube(request: YouTubeRequest):
    # Redirect to stream logic but blocking (not recommended for long running tasks)
    # Better to deprecate this one for the frontend
    pass # ... implementation omitted for brevity since we are moving to stream

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

