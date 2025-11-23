@echo off
echo Starting A2A Visualization Demo System...

start "Writer Agent (Port 8002)" cmd /k ".venv\Scripts\python backend/writer_agent.py"
start "Researcher Agent (Port 8001)" cmd /k ".venv\Scripts\python backend/researcher_agent.py"

echo Agents started. Starting Dashboard...
cd dashboard
start "Next.js Dashboard" cmd /k "npm run dev"
cd ..

echo.
echo System is running!
echo 1. Open Dashboard: http://localhost:3000
echo 2. Click "Start Demo" to begin (this will start the MCP server)
echo.
echo Note: The MCP WebSocket will connect when you start the first demo.
echo.
pause
