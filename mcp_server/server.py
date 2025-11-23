import asyncio
import sys
from mcp.server.fastmcp import FastMCP
from a2a.client import A2AClient, A2ACardResolver
from a2a.types import MessageSendParams, SendMessageRequest
from uuid import uuid4
import httpx
from datetime import datetime

# Import event server
from event_server import start_background_server, broadcast_event_safe

# Initialize FastMCP server
mcp = FastMCP("AgentGateway")

# Start WebSocket server
start_background_server()

# A2A Server URL - Researcher Agent
A2A_SERVER_URL = "http://localhost:8001"

def emit_event(event_type: str, data: dict, hop: str = "unknown", transport: str = "stdio"):
    """Emit a structured event to the WebSocket server."""
    event = {
        "id": str(uuid4()),
        "timestamp": datetime.now().isoformat(),
        "source": "MCP",
        "type": event_type,
        "hop": hop,
        "direction": "in" if "request" in event_type or "call" in event_type else "out",
        "transport": transport,
        "data": data
    }
    broadcast_event_safe(event)

@mcp.tool()
async def call_agent(task: str, api_key: str = None) -> str:
    """
    Delegates a complex task to the backend agent network via A2A Protocol.
    
    Args:
        task: A natural language description of the task (e.g., "Research vector databases").
        api_key: Optional OpenAI API key to use for this request.
    """
    print(f"[MCP] Received tool call: call_agent with task='{task}'", file=sys.stderr)
    
    # Emit tool call event
    emit_event(
        "mcp_tool_call", 
        {"tool": "call_agent", "arguments": {"task": task, "has_api_key": bool(api_key)}},
        hop="client→mcp",
        transport="stdio"
    )
    
    # Artificial delay to allow the visualization to show the "Client -> MCP" step
    await asyncio.sleep(2.5)
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as httpx_client:
            # Fetch the agent card
            resolver = A2ACardResolver(
                httpx_client=httpx_client,
                base_url=A2A_SERVER_URL,
            )
            agent_card = await resolver.get_agent_card()
            print(f"[MCP] Fetched agent card: {agent_card.name}", file=sys.stderr)
            
            # Initialize A2A Client
            client = A2AClient(
                httpx_client=httpx_client,
                agent_card=agent_card
            )
            
            # Construct message
            parts = [{'kind': 'text', 'text': task}]
            
            # Inject API key as a special system part if provided
            if api_key:
                parts.append({'kind': 'text', 'text': f"__API_KEY__:{api_key}"})
            
            send_message_payload = {
                'message': {
                    'role': 'user',
                    'parts': parts,
                    'messageId': uuid4().hex,
                },
            }
            
            request = SendMessageRequest(
                id=str(uuid4()),
                params=MessageSendParams(**send_message_payload)
            )
            
            print(f"[MCP] Sending message to A2A backend...", file=sys.stderr)
            
            # Emit A2A outgoing event
            emit_event(
                "a2a_outgoing_from_mcp",
                {"to": "RESEARCHER", "to_url": A2A_SERVER_URL},
                hop="mcp→researcher",
                transport="http"
            )
            
            # Create a task to send the message
            send_task = asyncio.create_task(client.send_message(request))
            
            # Periodically print status while waiting
            elapsed = 0
            while not send_task.done():
                await asyncio.sleep(5)
                elapsed += 5
                print(f"[MCP] Still working... ({elapsed}s elapsed)", file=sys.stderr)
            
            # Get the result
            response = await send_task
            
            print(f"[MCP] Received response from A2A backend", file=sys.stderr)
            
            # Extract text from response
            response_dict = response.model_dump(mode='json', exclude_none=True)
            
            result_text = "Error: No text content in response"
            if 'result' in response_dict:
                result = response_dict['result']
                if isinstance(result, dict) and 'parts' in result:
                    parts = result['parts']
                    if len(parts) > 0:
                        text = parts[0].get('text', '')
                        if text:
                            result_text = text
                            print(f"[MCP] Returning text (length: {len(text)})", file=sys.stderr)
            
            # Emit A2A incoming event
            emit_event(
                "a2a_incoming_at_mcp",
                {"from": "RESEARCHER", "content_length": len(result_text)},
                hop="researcher→mcp",
                transport="http"
            )
            
            # Emit tool result event
            emit_event(
                "mcp_tool_result",
                {
                    "content_length": len(result_text),
                    "content": result_text
                },
                hop="mcp→client",
                transport="stdio"
            )
            
            return result_text
            
    except Exception as e:
        error_msg = f"Error calling backend agent service: {str(e)}"
        print(f"[MCP] {error_msg}", file=sys.stderr)
        
        emit_event(
            "error",
            {"message": str(e)},
            hop="mcp",
            transport="internal"
        )
        
        import traceback
        traceback.print_exc(file=sys.stderr)
        return error_msg

if __name__ == "__main__":
    mcp.run()
