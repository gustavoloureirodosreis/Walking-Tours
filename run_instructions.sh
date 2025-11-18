# Start Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Use the API Key provided in your Roboflow dashboard
export ROBOFLOW_API_KEY="YOUR_API_KEY_HERE"
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Start Frontend (in a new terminal)
cd frontend
npm install
npm run dev
