# Crowd Density Analytics Dashboard

This project now runs entirely on the **Next.js frontend**. A serverless API
route inside the app accepts a local video upload, samples **one frame per
second**, and calls your Roboflow Rapid workflow to detect men vs. women.

## Architecture

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + Recharts.
- **Inference**: Roboflow Rapid serverless workflow (called from
  `app/api/analyze/route.ts`). No standalone backend or local SAM3 clone needed.

## Prerequisites

- Node.js 20+
- A Roboflow API key with access to the
  `gustavos-training-workspace/workflows/find-men-and-women` workflow.

## Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local` and add:

```
ROBOFLOW_API_KEY=*********
```

## Run

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`.

## Using the Dashboard

1. Upload a local video file (MP4/MOV/WEBM/AVI, ≤500 MB / ~10 minutes).
2. The API route stores it temporarily, extracts frames at 1 FPS with ffmpeg,
   and sends each frame to Roboflow Rapid.
3. Review the timeline (one data point per second) and the annotated preview
   returned by Roboflow.

## Notes

- The legacy FastAPI/SAM3 backend has been removed per the new requirements.
- All heavy lifting (upload, ffmpeg, Roboflow calls) happens on the server so
  the API key never ships to the browser.

<!-- "people walking background video" good query for background video on youtube -->
