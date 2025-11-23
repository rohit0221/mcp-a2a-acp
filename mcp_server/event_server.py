"""
WebSocket Event Server for MCP
Runs in a separate thread to serve visualization events.
"""
import asyncio
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
from collections import deque
import sys
import threading

# Global state
active_connections: List[WebSocket] = []
event_queue: deque = deque(maxlen=100)  # Keep last 100 events
loop: asyncio.AbstractEventLoop = None

app = FastAPI()

@app.websocket("/events")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    # Replay recent events to new connection
    print(f"[WebSocket] New connection. Replaying {len(event_queue)} recent events...", file=sys.stderr)
    for event in event_queue:
        try:
            await websocket.send_json(event)
        except Exception as e:
            print(f"[WebSocket] Error replaying event: {e}", file=sys.stderr)
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"[WebSocket] Connection closed. {len(active_connections)} remaining.", file=sys.stderr)

async def _broadcast(event: Dict[str, Any]):
    """Internal broadcast coroutine."""
    # Add to queue for replay
    event_queue.append(event)
    
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
    print("[WebSocket] Event server started on port 9000", file=sys.stderr)

def broadcast_event_safe(event: Dict[str, Any]):
    """Thread-safe method to broadcast an event."""
    if loop and loop.is_running():
        asyncio.run_coroutine_threadsafe(_broadcast(event), loop)
    else:
        # If loop not ready, still add to queue so it can be replayed
        event_queue.append(event)
        print(f"[WebSocket] Event queued (loop not ready): {event.get('type')}", file=sys.stderr)

def run_event_server():
    """Entry point to run the server."""
    uvicorn.run(app, host="0.0.0.0", port=9000, log_level="error")

def start_background_server():
    """Start the server in a background thread."""
    t = threading.Thread(target=run_event_server, daemon=True)
    t.start()
    print("[WebSocket] Background server thread started", file=sys.stderr)
    return t
