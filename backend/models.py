"""Pydantic models for request/response validation."""
from pydantic import BaseModel

class YouTubeRequest(BaseModel):
    url: str

