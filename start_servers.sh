#!/bin/bash

echo "Starting FastAPI Backend Server..."
cd backend
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

echo "Starting localhost.run SSH tunnel..."
ssh -o StrictHostKeyChecking=no -R 80:localhost:8000 nokey@localhost.run &
TUNNEL_PID=$!

echo "Both servers are running! Keep this terminal open."
echo "Press Ctrl+C to stop both."

trap "kill $SERVER_PID $TUNNEL_PID; exit" INT
wait
