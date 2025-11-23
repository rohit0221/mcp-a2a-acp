"""
Writer Agent - A2A Server with Event Broadcasting
Port: 8002
Skill: draft_report
Receives topic + notes, drafts markdown report
Broadcasts structured events via WebSocket
"""
import os
import uvicorn
from dotenv import load_dotenv
from openai import AsyncOpenAI
from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import time
import traceback as tb

from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message
from a2a.types import (
    AgentCapabilities,
    AgentCard,
    AgentSkill,
)

from event_broadcaster import init_event_queue, broadcast_event, event_queue

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
openai_client = AsyncOpenAI(api_key=api_key) if api_key else None

# WebSocket connections
active_connections: List[WebSocket] = []

class WriterAgent:
    """Drafts markdown reports from topic + notes."""
    
    def __init__(self, topic: str, notes: str):
        self.topic = topic
        self.notes = notes
    
    async def draft(self) -> str:
        if not openai_client:
            raise ValueError("OPENAI_API_KEY not found.")
        
        print(f"[Writer] Drafting report for: {self.topic}")
        
        # Broadcast OpenAI call event
        start_time = time.time()
        await broadcast_event(
            "WRITER",
            "openai_call",
            {
                "model": "gpt-4o-mini",
                "purpose": "draft_report",
                "topic": self.topic,
                "notes_length": len(self.notes)
            },
            status="pending"
        )
        
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a technical writer. Create a markdown report based on the input."},
                {"role": "user", "content": f"Topic: {self.topic}\nNotes:\n{self.notes}"}
            ]
        )
        report = response.choices[0].message.content
        
        latency = int((time.time() - start_time) * 1000)
        
        # Broadcast OpenAI response event
        await broadcast_event(
            "WRITER",
            "openai_response",
            {
                "tokens": response.usage.total_tokens if response.usage else 0,
                "content_length": len(report)
            },
            latency_ms=latency,
            status="success"
        )
        
        print(f"[Writer] Report completed (length: {len(report)})")
        return report

class WriterAgentExecutor(AgentExecutor):
    """Executor for Writer Agent."""
    
    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        # Extract message content
        content = ""
        message_dict = None
        if hasattr(context, 'message') and context.message:
            message_dict = context.message.model_dump()
            for part in context.message.parts:
                part_dict = part.model_dump() if hasattr(part, 'model_dump') else {}
                if 'text' in part_dict:
                    content = part_dict['text']
                    break
        
        # Broadcast RPC request received
        print(f"[Writer] Broadcasting rpc_request event...")
        await broadcast_event(
            "WRITER",
            "rpc_request",
            {
                "agent": "WRITER",
                "skill": "draft_report",
                "content_length": len(content)
            },
            a2a_message=message_dict,
            status="success"
        )
        print(f"[Writer] Event broadcasted successfully")
        
        if not content:
            await event_queue.enqueue_event(new_agent_text_message("Error: No content provided"))
            return
        
        # Parse topic and notes from content
        lines = content.split('\n', 1)
        if len(lines) < 2 or not lines[0].startswith("Topic:"):
            await event_queue.enqueue_event(new_agent_text_message("Error: Invalid format. Expected 'Topic: X\\nNotes:\\n...'"))
            return
        
        topic = lines[0].replace("Topic:", "").strip()
        notes = lines[1].strip()
        
        print(f"[Writer] Received topic: '{topic}'")
        print(f"[Writer] Notes length: {len(notes)}")
        
        try:
            agent = WriterAgent(topic, notes)
            report = await agent.draft()
            
            # Broadcast RPC response sent
            await broadcast_event(
                "WRITER",
                "rpc_response",
                {
                    "agent": "WRITER",
                    "result_length": len(report),
                    "status": "success"
                },
                status="success"
            )
            
            await event_queue.enqueue_event(new_agent_text_message(report))
        except Exception as e:
            error_stack = tb.format_exc()
            print(f"[Writer] Error: {e}")
            tb.print_exc()
            
            # Broadcast error event
            await broadcast_event(
                "WRITER",
                "error",
                {
                    "message": str(e)
                },
                status="error",
                error_origin={
                    "component": "WRITER",
                    "phase": "execution",
                    "stack": error_stack
                }
            )
            
            await event_queue.enqueue_event(new_agent_text_message(f"Error: {str(e)}"))
    
    async def cancel(
        self, context: RequestContext, event_queue: EventQueue
    ) -> None:
        raise Exception('cancel not supported')

if __name__ == '__main__':
    # Initialize event queue
    init_event_queue()
    
    skill = AgentSkill(
        id='draft_report',
        name='Draft Report',
        description='Draft a markdown report from topic and research notes.',
        tags=['writing', 'drafting'],
        examples=['Draft a report on AI'],
    )
    
    agent_card = AgentCard(
        name='protocol-native-writer',
        description='An agent that drafts markdown reports from research notes.',
        url='http://localhost:8002/',
        version='0.1.0',
        default_input_modes=['text'],
        default_output_modes=['text'],
        capabilities=AgentCapabilities(streaming=False),
        skills=[skill],
    )
    
    request_handler = DefaultRequestHandler(
        agent_executor=WriterAgentExecutor(),
        task_store=InMemoryTaskStore(),
    )
    
    server_app = A2AStarletteApplication(
        agent_card=agent_card,
        http_handler=request_handler,
    )
    
    # Get the Starlette app
    app = server_app.build()
    
    # Background task to broadcast events to WebSocket clients
    async def broadcast_to_websockets():
        import asyncio
        import sys
        from event_broadcaster import get_event_queue
        
        print(f"[Writer] Broadcast task STARTING...", file=sys.stderr)
        
        try:
            while True:
                eq = get_event_queue()
                if eq is None:
                    print("[Writer] Waiting for event queue initialization...", file=sys.stderr)
                    await asyncio.sleep(1)
                    continue
                
                if not eq.empty():
                    event = await eq.get()
                    print(f"[Writer] Processing event from queue: {event['type']}", file=sys.stderr)
                    
                    # Broadcast to all connected clients
                    if not active_connections:
                        print(f"[Writer] No active connections to receive event", file=sys.stderr)
                    
                    disconnected = []
                    for connection in active_connections:
                        try:
                            await connection.send_json(event)
                            print(f"[Writer] Sent event to client: {event['type']}", file=sys.stderr)
                        except Exception as e:
                            print(f"[Writer] Failed to send to client: {e}", file=sys.stderr)
                            disconnected.append(connection)
                    
                    # Remove disconnected clients
                    for conn in disconnected:
                        if conn in active_connections:
                            active_connections.remove(conn)
                
                await asyncio.sleep(0.01)  # Check frequently
        except Exception as e:
            print(f"[Writer] CRITICAL ERROR in broadcast task: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
    
    # Add WebSocket endpoint for event streaming
    async def websocket_events(websocket: WebSocket):
        await websocket.accept()
        active_connections.append(websocket)
        print(f"[Writer] WebSocket client connected. Total: {len(active_connections)}")
        
        try:
            # Keep connection alive
            while True:
                # Wait for client messages (ping/pong)
                try:
                    await websocket.receive_text()
                except:
                    break
        except WebSocketDisconnect:
            pass
        finally:
            if websocket in active_connections:
                active_connections.remove(websocket)
            print(f"[Writer] WebSocket client disconnected. Total: {len(active_connections)}")
    
    # Add WebSocket route to app
    from starlette.routing import WebSocketRoute
    app.routes.append(WebSocketRoute("/events", websocket_events))
    
    # Start background task for broadcasting
    import asyncio
    
    @app.on_event("startup")
    async def startup_event():
        asyncio.create_task(broadcast_to_websockets())
        print("[Writer] Started WebSocket broadcast task")
    
    print("Starting Writer Agent on port 8002...")
    print("WebSocket events available at ws://localhost:8002/events")
    uvicorn.run(app, host='0.0.0.0', port=8002)
