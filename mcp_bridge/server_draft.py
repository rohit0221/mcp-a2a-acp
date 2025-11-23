"""
MCP Bridge Server
Wraps the MCP server process, captures stdio traffic, and broadcasts events via WebSocket.
Port: 9000
"""
import asyncio
import json
import sys
import os
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List, Optional
from contextlib import asynccontextmanager
import subprocess
from datetime import datetime
from uuid import uuid4

# Add backend directory to path to import event_broadcaster logic
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Define event structure locally to avoid dependency issues if backend isn't in path
def create_event(source, event_type, data, hop="unknown", transport="stdio"):
    return {
        "id": str(uuid4()),
        "timestamp": datetime.now().isoformat(),
        "source": source,
        "type": event_type,
        "hop": hop,
        "direction": "in" if "request" in event_type or "call" in event_type else "out",
        "transport": transport,
        "data": data
    }

# Global state
mcp_process: Optional[asyncio.subprocess.Process] = None
active_connections: List[WebSocket] = []
event_queue: asyncio.Queue = asyncio.Queue()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch MCP server
    global mcp_process
    print("[Bridge] Starting MCP Server...")
    
    # Command to run the MCP server
    cmd = [sys.executable, "mcp_server/server.py"]
    
    # Create subprocess with pipes for stdin/stdout/stderr
    mcp_process = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    
    # Start background tasks to read stdout/stderr
    asyncio.create_task(read_stdout())
    asyncio.create_task(read_stderr())
    asyncio.create_task(broadcast_events())
    
    print(f"[Bridge] MCP Server started with PID {mcp_process.pid}")
    
    yield
    
    # Shutdown: Kill MCP server
    if mcp_process:
        print("[Bridge] Stopping MCP Server...")
        try:
            mcp_process.terminate()
            await mcp_process.wait()
        except:
            pass
        print("[Bridge] MCP Server stopped")

app = FastAPI(lifespan=lifespan)

async def read_stdout():
    """Read stdout from MCP server (JSON-RPC messages)."""
    if not mcp_process or not mcp_process.stdout:
        return
        
    while True:
        line = await mcp_process.stdout.readline()
        if not line:
            break
            
        line_str = line.decode().strip()
        if not line_str:
            continue
            
        try:
            # Try to parse as JSON-RPC
            message = json.loads(line_str)
            
            # Analyze message type
            event = None
            
            # Tool Call (Request)
            if "method" in message and message["method"] == "tools/call":
                params = message.get("params", {})
                tool_name = params.get("name")
                args = params.get("arguments", {})
                
                event = create_event(
                    source="MCP",
                    event_type="mcp_tool_call",
                    hop="client→mcp",
                    data={
                        "tool": tool_name,
                        "arguments": args,
                        "id": message.get("id")
                    }
                )
            
            # Tool Result (Response)
            elif "result" in message and "content" in message["result"]:
                # This is a response to the client
                content = message["result"]["content"]
                text_content = ""
                for item in content:
                    if item.get("type") == "text":
                        text_content += item.get("text", "")
                
                event = create_event(
                    source="MCP",
                    event_type="mcp_tool_result",
                    hop="mcp→client",
                    data={
                        "content_length": len(text_content),
                        "preview": text_content[:100] + "..." if len(text_content) > 100 else text_content,
                        "id": message.get("id")
                    }
                )
            
            if event:
                await event_queue.put(event)
                
            # Forward to stdout for the actual client to see
            # We print to our own stdout so the client connected to the bridge sees it
            # But wait, the bridge is an HTTP server, not a CLI tool.
            # The client connects to the bridge via stdio? No.
            # The bridge REPLACES the MCP server in the client config?
            # OR the bridge is just for monitoring?
            
            # For this architecture:
            # Client -> Bridge (stdio) -> MCP Server (stdio)
            # But implementing a full stdio proxy in Python with FastAPI is tricky.
            
            # ALTERNATIVE: The Bridge IS the MCP server wrapper.
            # The user runs the bridge INSTEAD of the MCP server.
            # So we need to forward stdin too.
            
            # For now, let's just print to stdout so if run from CLI it works
            print(line_str)
            sys.stdout.flush()
            
        except json.JSONDecodeError:
            # Not JSON, just log
            pass

async def read_stderr():
    """Read stderr from MCP server (Logs)."""
    if not mcp_process or not mcp_process.stderr:
        return
        
    while True:
        line = await mcp_process.stderr.readline()
        if not line:
            break
            
        line_str = line.decode().strip()
        if not line_str:
            continue
            
        # Forward to stderr
        print(line_str, file=sys.stderr)
        
        # Also capture interesting logs as events
        if "[MCP]" in line_str:
            # This is a log from our MCP server
            pass

async def broadcast_events():
    """Broadcast events to WebSocket clients."""
    while True:
        event = await event_queue.get()
        disconnected = []
        for connection in active_connections:
            try:
                await connection.send_json(event)
            except:
                disconnected.append(connection)
        
        for conn in disconnected:
            if conn in active_connections:
                active_connections.remove(conn)

@app.websocket("/events")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    print(f"[Bridge] Client connected. Total: {len(active_connections)}", file=sys.stderr)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"[Bridge] Client disconnected", file=sys.stderr)

if __name__ == "__main__":
    print("Starting MCP Bridge on port 9000...", file=sys.stderr)
    # We use fd 0 (stdin) and 1 (stdout) for MCP communication if run as a tool
    # But uvicorn hijacks stdout/stdin.
    # This is a problem. The Bridge cannot be both a stdio pass-through AND a uvicorn server easily.
    
    # SOLUTION: Run uvicorn on a separate thread/process, or use a different approach.
    # Or, since this is for DEMO purposes, we can just have the Client connect to the Bridge via HTTP/WebSocket?
    # No, the Client (demo_client.py) uses `stdio_client`.
    
    # Let's stick to the plan: The Bridge is a standalone server that runs the MCP server.
    # But for the demo client to work, it needs to talk to the Bridge via stdio.
    
    # Actually, for the visualization, we can just modify `mcp_server/server.py` to broadcast events directly!
    # That's much simpler than a proxy.
    # We just need to add WebSocket support to the MCP server itself.
    pass
