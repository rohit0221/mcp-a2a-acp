"""
WebSocket Event Server for MCP
Runs in a separate thread to serve visualization events.
"""
import asyncio
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import sys
import threading

# Global state
active_connections: List[WebSocket] = []
loop: asyncio.AbstractEventLoop = None

app = FastAPI()

@app.websocket("/events")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

async def _broadcast(event: Dict[str, Any]):
    """Internal broadcast coroutine."""
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(event)
        except:
            disconnected.append(connection)
    
    for conn in disconnected:
        if conn in active_connections:
            active_connections.remove(conn)

@app.on_event("startup")
async def startup_event():
    global loop
    loop = asyncio.get_running_loop()

def broadcast_event_safe(event: Dict[str, Any]):
    """Thread-safe method to broadcast an event."""
    if loop and loop.is_running():
        asyncio.run_coroutine_threadsafe(_broadcast(event), loop)

def run_event_server():
    """Entry point to run the server."""
    uvicorn.run(app, host="0.0.0.0", port=9000, log_level="error")

def start_background_server():
    """Start the server in a background thread."""
    t = threading.Thread(target=run_event_server, daemon=True)
    t.start()
    return t
