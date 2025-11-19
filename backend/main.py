"""FastAPI application for crowd density analysis."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import tempfile
import json
import asyncio
from inference_sdk import InferenceHTTPClient

from config import ROBOFLOW_API_KEY, ROBOFLOW_API_URL
from models import YouTubeRequest
from cache import get_cache_file, load_from_cache, save_to_cache
from video_processor import analyze_video_frames
from youtube_service import validate_youtube_video, download_youtube_video

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Roboflow client
CLIENT = InferenceHTTPClient(
    api_url=ROBOFLOW_API_URL,
    api_key=ROBOFLOW_API_KEY
)

@app.post("/analyze_youtube_stream")
async def analyze_youtube_stream(request: YouTubeRequest):
    """Stream analysis progress and results for a YouTube video."""
    if not ROBOFLOW_API_KEY:
        raise HTTPException(status_code=500, detail="ROBOFLOW_API_KEY not set")

    async def event_generator():
        try:
            # Step 1: Validate YouTube video
            yield json.dumps({"status": "checking_url", "progress": 0}) + "\n"

            loop = asyncio.get_event_loop()
            video_info = await loop.run_in_executor(
                None,
                validate_youtube_video,
                request.url
            )

            if not video_info or video_info.get('error'):
                error_msg = video_info.get('error', "Video unavailable, private, or restricted.") if video_info else "Video unavailable."
                yield json.dumps({"status": "error", "error": error_msg}) + "\n"
                return

            if video_info.get('is_live'):
                yield json.dumps({"status": "error", "error": "Live streams are not supported."}) + "\n"
                return

            # Step 2: Check cache using video ID
            video_id = video_info.get('id')
            cache_file = get_cache_file(video_id, prefix="yt_")

            cached_result = load_from_cache(cache_file)
            if cached_result:
                yield json.dumps({"status": "cached", "progress": 100}) + "\n"
                yield json.dumps({"status": "complete", "data": cached_result}) + "\n"
                return

            # Step 3: Download video
            yield json.dumps({"status": "downloading", "progress": 0}) + "\n"

            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = await loop.run_in_executor(
                    None,
                    download_youtube_video,
                    request.url,
                    temp_dir
                )

                # Step 4: Analyze video frames
                yield json.dumps({"status": "analyzing", "progress": 0}) + "\n"

                CLIENT.api_key = ROBOFLOW_API_KEY
                timeline = []

                for data_point in analyze_video_frames(temp_path, CLIENT):
                    frame_index = data_point.pop('frame_index')
                    total_frames = data_point.pop('total_frames')

                    # Yield progress every ~5 intervals
                    if len(timeline) % 5 == 0:
                        progress = int((frame_index / total_frames) * 100)
                        yield json.dumps({"status": "analyzing", "progress": progress}) + "\n"
                        await asyncio.sleep(0)

                    timeline.append(data_point)

                # Step 5: Save to cache and return
                save_to_cache(cache_file, timeline)
                yield json.dumps({"status": "complete", "data": timeline}) + "\n"

        except Exception as e:
            yield json.dumps({"status": "error", "error": str(e)}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
