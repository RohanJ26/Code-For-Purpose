#!/bin/bash

# DataMind - AI Business Analyst Platform
# Local Development Setup Script

echo "======================================"
echo "DataMind - Starting Development"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo -e "${BLUE}✓ Python and Node.js are installed${NC}"
echo ""

# Setup Python backend
echo -e "${YELLOW}Setting up Python backend...${NC}"
cd api

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check for GEMINI_API_KEY
if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  GEMINI_API_KEY not set!${NC}"
    echo "Please set your Google Gemini API key:"
    echo "  export GEMINI_API_KEY='your-api-key-here'"
    echo ""
    echo "Get one at: https://ai.google.dev/api/python/google/generativeai"
    echo ""
fi

# Start the FastAPI backend
echo -e "${GREEN}Starting FastAPI backend on http://localhost:8000${NC}"
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ..

# Give the backend a moment to start
sleep 2

# Setup and start Next.js frontend
echo -e "${YELLOW}Setting up Next.js frontend...${NC}"

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    pnpm install
fi

# Start the Next.js development server
echo -e "${GREEN}Starting Next.js frontend on http://localhost:3000${NC}"
pnpm dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}======================================"
echo "✓ Development servers started!"
echo "======================================${NC}"
echo ""
echo "Frontend: ${BLUE}http://localhost:3000${NC}"
echo "Backend:  ${BLUE}http://localhost:8000${NC}"
echo "Docs:     ${BLUE}http://localhost:8000/docs${NC}"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "Servers stopped."
}

trap cleanup EXIT

# Wait for both processes
wait
