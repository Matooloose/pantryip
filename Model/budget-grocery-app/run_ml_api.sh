#!/bin/bash

# Budget Grocery App - ML API Runner
# This script starts the FastAPI backend for the ML Ranker.

# Navigate to project root
cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Set environment variables
export PYTHONPATH=$PYTHONPATH:.

# Start the server
echo "Starting PantryIQ ML Ranker API on http://localhost:8000..."
uvicorn src.api.main:app --host 0.0.0.0 --port 8002 --reload
