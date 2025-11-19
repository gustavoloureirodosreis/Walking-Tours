# Crowd Density Analytics Dashboard

A demo application for analyzing crowd density in videos using Roboflow's Inference SDK with a specialized People Detection model.

## Architecture

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + Recharts
- **Backend**: FastAPI + Roboflow Inference (Hosted) + Supervision

## Prerequisites

- Node.js (v18+)
- Python (v3.11+)
- Roboflow API Key

## Setup & Run

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run the server (Set your API key)
export ROBOFLOW_API_KEY="your_api_key_here"
uvicorn main:app --reload
```

Server runs at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Usage

1. Open the frontend dashboard.
2. Upload a video file (MP4, AVI, MOV).
3. Wait for the analysis to complete.
4. View the stats and crowd density timeline chart.
