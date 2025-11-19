"""Cache management for video analysis results."""
import hashlib
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional
from config import CACHE_DIR

def get_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def get_cache_file(identifier: str, prefix: str = "") -> Path:
    """Get cache file path for a given identifier."""
    filename = f"{prefix}{identifier}.csv" if prefix else f"{identifier}.csv"
    return CACHE_DIR / filename

def load_from_cache(cache_file: Path) -> Optional[List[Dict]]:
    """Load analysis results from cache if exists."""
    if cache_file.exists():
        df = pd.read_csv(cache_file)
        return df.to_dict(orient="records")
    return None

def save_to_cache(cache_file: Path, timeline: List[Dict]) -> None:
    """Save analysis results to cache."""
    df = pd.DataFrame(timeline)
    df.to_csv(cache_file, index=False)

