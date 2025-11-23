"""
Standalone WebSocket Event Server
Runs on port 9000 to broadcast events from agents
"""
from mcp_server.event_server import run_event_server

if __name__ == "__main__":
    print("Starting WebSocket Event Server on port 9000...")
    run_event_server()
