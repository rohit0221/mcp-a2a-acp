"""
Researcher Agent - A2A Server with Event Broadcasting
Port: 8001
Skill: research_topic
Researches topic, calls Writer Agent via A2A, returns final report
Broadcasts structured events via WebSocket
"""
import os
import uvicorn
from dotenv import load_dotenv
from openai import AsyncOpenAI
import httpx
from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import time
import traceback as tb
import sys

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
    MessageSendParams,
    SendMessageRequest,
)
from a2a.client import A2AClient, A2ACardResolver
from uuid import uuid4

from event_broadcaster import init_event_queue, broadcast_event, get_event_queue

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
openai_client = AsyncOpenAI(api_key=api_key) if api_key else None

WRITER_AGENT_URL = "http://localhost:8002"

# WebSocket connections
active_connections: List[WebSocket] = []

class ResearcherAgent:
    """Researches topics and delegates drafting to Writer Agent via A2A."""
    
    def __init__(self, topic: str):
        self.topic = topic
    
    async def research(self) -> str:
        """Generate research notes using OpenAI."""
        if not openai_client:
            raise ValueError("OPENAI_API_KEY not found.")
        
        print(f"[Researcher] Researching: {self.topic}")
        
        # Broadcast OpenAI call event
        start_time = time.time()
        await broadcast_event(
            "RESEARCHER",
            "openai_call",
            {
                "model": "gpt-4o-mini",
                "purpose": "research_topic",
                "topic": self.topic
            },
            status="pending"
        )
        
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a senior researcher. Provide 4-5 key bullet points about the requested topic."},
                {"role": "user", "content": f"Research topic: {self.topic}"}
            ]
        )
        notes = response.choices[0].message.content
        
        latency = int((time.time() - start_time) * 1000)
        
        # Broadcast OpenAI response event
        await broadcast_event(
            "RESEARCHER",
            "openai_response",
            {
                "tokens": response.usage.total_tokens if response.usage else 0,
                "content_length": len(notes)
            },
            latency_ms=latency,
            status="success"
        )
        
        print(f"[Researcher] Research completed (length: {len(notes)})")
        return notes
    
    async def call_writer_agent(self, notes: str) -> str:
        """Call Writer Agent via A2A protocol to draft the report."""
        print(f"[Researcher] Calling Writer Agent via A2A...")
        
        async with httpx.AsyncClient(timeout=120.0) as httpx_client:
            # Fetch Writer's AgentCard
            resolver = A2ACardResolver(
                httpx_client=httpx_client,
                base_url=WRITER_AGENT_URL,
            )
            writer_card = await resolver.get_agent_card()
            print(f"[Researcher] Found Writer Agent: {writer_card.name}")
            
            # Initialize A2A Client for Writer
            writer_client = A2AClient(
                httpx_client=httpx_client,
                agent_card=writer_card
            )
            
            # Construct message for Writer
            content = f"Topic: {self.topic}\nNotes:\n{notes}"
            
            send_message_payload = {
                'message': {
                    'role': 'user',
                    'parts': [
                        {'kind': 'text', 'text': content}
                    ],
                    'messageId': uuid4().hex,
                },
            }
            
            request = SendMessageRequest(
                id=str(uuid4()),
                params=MessageSendParams(**send_message_payload)
            )
            
            # Broadcast A2A outgoing event
            await broadcast_event(
                "RESEARCHER",
                "a2a_outgoing",
                {
                    "to": "WRITER",
                    "to_url": WRITER_AGENT_URL,
                    "content_length": len(content)
                },
                a2a_message=send_message_payload['message'],
                status="pending"
            )
            
            # Send via A2A
            print(f"[Researcher] Sending A2A message to Writer...")
            start_time = time.time()
            response = await writer_client.send_message(request)
            latency = int((time.time() - start_time) * 1000)
            
            # Extract report from response
            response_dict = response.model_dump(mode='json', exclude_none=True)
            
            # Broadcast A2A incoming event
            result_message = None
            if 'result' in response_dict:
                result_message = response_dict['result']
                
            await broadcast_event(
                "RESEARCHER",
                "a2a_incoming",
                {
                    "from": "WRITER",
                    "latency_ms": latency,
                    "status": "success"
                },
                a2a_message=result_message,
                latency_ms=latency,
                status="success"
            )
            
            if result_message and 'parts' in result_message:
                parts = result_message['parts']
                if len(parts) > 0:
                    report = parts[0].get('text', '')
                    print(f"[Researcher] Received report from Writer (length: {len(report)})")
                    return report
            
            raise ValueError("Failed to extract report from Writer Agent response")

class ResearcherAgentExecutor(AgentExecutor):
    """Executor for Researcher Agent."""
    
    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        # Extract topic
        topic = ""
        message_dict = None
        if hasattr(context, 'message') and context.message:
            message_dict = context.message.model_dump()
            for part in context.message.parts:
                part_dict = part.model_dump() if hasattr(part, 'model_dump') else {}
                if 'text' in part_dict:
                    topic = part_dict['text']
                    break
        
        # Broadcast RPC request received (from MCP)
        await broadcast_event(
            "RESEARCHER",
            "rpc_request",
            {
                "agent": "RESEARCHER",
                "skill": "research_topic",
                "content_length": len(topic)
            },
            a2a_message=message_dict,
            status="success"
        )
        
        if not topic:
            await event_queue.enqueue_event(new_agent_text_message("Error: No topic provided"))
            return
        
        print(f"[Researcher] Received topic: '{topic}'")
        
        try:
            agent = ResearcherAgent(topic)
            
            # Step 1: Research
            notes = await agent.research()
            
            # Step 2: Call Writer Agent via A2A
            report = await agent.call_writer_agent(notes)
            
            # Broadcast RPC response sent (to MCP)
            await broadcast_event(
                "RESEARCHER",
                "rpc_response",
                {
                    "agent": "RESEARCHER",
                    "result_length": len(report),
                    "status": "success"
                },
                status="success"
            )
            
            # Return final report
            await event_queue.enqueue_event(new_agent_text_message(report))
            print(f"[Researcher] Workflow complete!")
            
        except Exception as e:
            error_stack = tb.format_exc()
            print(f"[Researcher] Error: {e}")
            tb.print_exc()
            
            # Broadcast error event
            await broadcast_event(
                "RESEARCHER",
                "error",
                {
                    "message": str(e)
                },
                status="error",
                error_origin={
                    "component": "RESEARCHER",
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
        id='research_topic',
        name='Research Topic',
        description='Research a topic and produce a comprehensive report.',
        tags=['research'],
        examples=['Research quantum computing'],
    )
    
    agent_card = AgentCard(
        name='protocol-native-researcher',
        description='An agent that researches topics and coordinates with Writer Agent.',
        url='http://localhost:8001/',
        version='0.1.0',
        default_input_modes=['text'],
        default_output_modes=['text'],
        capabilities=AgentCapabilities(streaming=False),
        skills=[skill],
    )
    
    request_handler = DefaultRequestHandler(
        agent_executor=ResearcherAgentExecutor(),
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
        from event_broadcaster import get_event_queue
        
        print(f"[Researcher] Broadcast task STARTING...", file=sys.stderr)
        
        try:
            while True:
                eq = get_event_queue()
                if eq is None:
                    print("[Researcher] Waiting for event queue initialization...", file=sys.stderr)
                    await asyncio.sleep(1)
                    continue
                
                if not eq.empty():
                    event = await eq.get()
                    print(f"[Researcher] Processing event from queue: {event['type']}", file=sys.stderr)
                    
                    # Broadcast to all connected clients
                    if not active_connections:
                        print(f"[Researcher] No active connections to receive event", file=sys.stderr)
                    
                    disconnected = []
                    for connection in active_connections:
                        try:
                            await connection.send_json(event)
                            print(f"[Researcher] Sent event to client: {event['type']}", file=sys.stderr)
                        except Exception as e:
                            print(f"[Researcher] Failed to send to client: {e}", file=sys.stderr)
                            disconnected.append(connection)
                    
                    # Remove disconnected clients
                    for conn in disconnected:
                        if conn in active_connections:
                            active_connections.remove(conn)
                
                await asyncio.sleep(0.01)  # Check frequently
        except Exception as e:
            print(f"[Researcher] CRITICAL ERROR in broadcast task: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
    
    # Add WebSocket endpoint for event streaming
    async def websocket_events(websocket: WebSocket):
        await websocket.accept()
        active_connections.append(websocket)
        print(f"[Researcher] WebSocket client connected. Total: {len(active_connections)}")
        
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
            print(f"[Researcher] WebSocket client disconnected. Total: {len(active_connections)}")
    
    # Add WebSocket route to app
    from starlette.routing import WebSocketRoute
    app.routes.append(WebSocketRoute("/events", websocket_events))
    
    # Start background task for broadcasting
    import asyncio
    
    @app.on_event("startup")
    async def startup_event():
        asyncio.create_task(broadcast_to_websockets())
        print("[Researcher] Started WebSocket broadcast task")
    
    print("Starting Researcher Agent on port 8001...")
    print("WebSocket events available at ws://localhost:8001/events")
    uvicorn.run(app, host='0.0.0.0', port=8001)
