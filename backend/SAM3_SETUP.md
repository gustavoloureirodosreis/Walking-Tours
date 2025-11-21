## SAM 3 Local Setup

These steps configure the backend to run **100 % locally** with Meta’s SAM 3 checkpoints—no Roboflow or hosted inference required.

1. **Request checkpoint access (one time)**

   - Visit [ai.meta.com/sam3](https://ai.meta.com/sam3/) and accept the license.
   - Request access to the Hugging Face repository referenced in the [SAM3 README](https://github.com/facebookresearch/sam3) and wait for approval.

2. **Authenticate with Hugging Face**

   ```bash
   hf auth login
   ```

   Use a token that has read access to the SAM3 repo.

3. **Clone the SAM3 repository locally**

   ```bash
   mkdir -p external
   cd external
   git clone https://github.com/facebookresearch/sam3.git
   cd ..
   ```

   The backend loads SAM3 straight from `external/sam3`, so this clone must exist.

4. **Install PyTorch + vision/audio (match your platform/GPU)**

   - Apple Silicon / CPU-only (recommended):
     ```bash
     pip install torch==2.4.1 torchvision==0.19.1 torchaudio==2.4.1
     ```
   - NVIDIA GPU example (CUDA 12.1 wheel):
     ```bash
     pip install torch==2.4.1 torchvision==0.19.1 torchaudio==2.4.1 \
       --index-url https://download.pytorch.org/whl/cu121
     ```
   - For other platforms, use the selector at [pytorch.org/get-started/locally](https://pytorch.org/get-started/locally/) but keep the versions in the same 2.4.x family.

5. **Install backend dependencies**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

6. **Environment configuration**

   - `SAM3_PROMPTS` (default: `men,women`) – comma separated list of concepts to track.
   - `SAM3_CONFIDENCE_THRESHOLD` (default: `0.25`) – filter low-score detections.
   - `SAM3_DEVICE` (default: auto-detect `cuda` vs `cpu`) – override when needed.
   - `FRAME_INTERVAL_SECONDS` & `MOTION_THRESHOLD` – control sampling rate.

7. **Run the FastAPI server**
   ```bash
   uvicorn main:app --reload
   ```

On first launch the server downloads the SAM3 checkpoints via Hugging Face (once per machine) and caches them inside your HF cache (~`~/.cache/huggingface`). Subsequent runs stream video frames through SAM3 entirely on your hardware at the configured sampling stride, no Roboflow required.
