"""YouTube video handling and validation."""
import os
import tempfile
import requests
import yt_dlp
from typing import Dict, Optional

def validate_youtube_video(url: str) -> Optional[Dict]:
    """
    Validate YouTube video availability and embeddability.

    Returns video info dict if valid, None or error dict if invalid.
    """
    try:
        # Check if video is embeddable via oembed endpoint
        oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
        r = requests.get(oembed_url)
        if r.status_code != 200:
            return {"error": "Video is not embeddable or unavailable."}

        # Extract video info using yt-dlp
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            return info
    except Exception as e:
        return None

def download_youtube_video(url: str, temp_dir: str) -> str:
    """
    Download YouTube video to temporary directory.

    Returns the path to the downloaded file.
    """
    ydl_opts = {
        'format': 'best[ext=mp4]/best',
        'outtmpl': os.path.join(temp_dir, '%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return ydl.prepare_filename(info)

