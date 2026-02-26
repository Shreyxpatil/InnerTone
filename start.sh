#!/bin/bash
# InnerTone - Start both frontend and backend
# Usage: bash start.sh

cd /home/ca/Projects/InnerTone

echo "🔧 Starting InnerTone..."

# Kill any existing processes on our ports
fuser -k 8000/tcp 2>/dev/null
fuser -k 5173/tcp 2>/dev/null
sleep 1

# Start Backend
echo "🚀 Starting Backend on :8000..."
source .venv/bin/activate
PYTHONPATH=. nohup uvicorn innertone.main:app --host 0.0.0.0 --port 8000 > /tmp/innertone_backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Start Frontend (with auto-restart loop)
echo "🎨 Starting Frontend on :5173..."
(
    while true; do
        cd /home/ca/Projects/InnerTone/frontend
        npx vite --host 0.0.0.0 2>&1 | tee /tmp/innertone_frontend.log
        echo "⚠️  Frontend crashed, restarting in 2 seconds..."
        sleep 2
    done
) &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

sleep 3

echo ""
echo "✅ InnerTone is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo ""
echo "   To stop: kill $BACKEND_PID $FRONTEND_PID"
