"""
Event broadcasting utilities for A2A agents.
Provides structured event emission with transport, hop inference, and A2A schema normalization.
"""
from datetime import datetime
from uuid import uuid4
from typing import Optional, Dict, Any, Literal
import asyncio

# Global event queue for WebSocket broadcasting
event_queue: asyncio.Queue = None

def init_event_queue():
    """Initialize the global event queue."""
    global event_queue
    event_queue = asyncio.Queue()
    return event_queue

def get_event_queue():
    """Get the global event queue."""
    return event_queue

def infer_hop(source: str, event_type: str, direction: str) -> str:
    """Infer the hop based on source, event type, and direction."""
    hop_map = {
        ("WRITER", "rpc_request", "in"): "researcher→writer",
        ("WRITER", "rpc_response", "out"): "writer→researcher",
        ("WRITER", "openai_call", "out"): "writer→openai",
        ("WRITER", "openai_response", "in"): "openai→writer",
        ("RESEARCHER", "rpc_request", "in"): "mcp→researcher",
        ("RESEARCHER", "rpc_response", "out"): "researcher→mcp",
        ("RESEARCHER", "openai_call", "out"): "researcher→openai",
        ("RESEARCHER", "openai_response", "in"): "openai→researcher",
        ("RESEARCHER", "a2a_outgoing", "out"): "researcher→writer",
        ("RESEARCHER", "a2a_incoming", "in"): "writer→researcher",
    }
    return hop_map.get((source, event_type, direction), "unknown")

def normalize_a2a_payload(message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract and normalize A2A message schema."""
    if not message:
        return None
    
    parts = message.get("parts", [])
    normalized_parts = []
    for part in parts:
        text = part.get("text", "")
        # Truncate long text for logging
        if len(text) > 200:
            text = text[:200] + "..."
        normalized_parts.append({
            "kind": part.get("kind"),
            "text": text
        })
    
    return {
        "message_id": message.get("messageId"),
        "role": message.get("role"),
        "parts": normalized_parts
    }

async def broadcast_event(
    source: Literal["WRITER", "RESEARCHER"],
    event_type: str,
    data: Dict[str, Any],
    a2a_message: Optional[Dict[str, Any]] = None,
    latency_ms: Optional[int] = None,
    status: Optional[str] = None,
    error_origin: Optional[Dict[str, Any]] = None
):
    """
    Broadcast a structured event to all WebSocket clients.
    
    Args:
        source: Event source (WRITER or RESEARCHER)
        event_type: Type of event (rpc_request, a2a_outgoing, etc.)
        data: Event-specific payload
        a2a_message: Optional A2A message for schema normalization
        latency_ms: Optional latency in milliseconds
        status: Optional status (pending, success, error)
        error_origin: Optional error origin metadata
    """
    if event_queue is None:
        print(f"[EventBroadcaster] WARNING: event_queue is None! Event type: {event_type}")
        return  # Queue not initialized
    
    print(f"[EventBroadcaster] Broadcasting {event_type} from {source}")
    
    # Determine direction
    if "request" in event_type or "incoming" in event_type:
        direction = "in"
    elif "response" in event_type:
        # Responses are "in" if they are FROM OpenAI (openai_response)
        # Responses are "out" if they are TO another agent (rpc_response)
        if event_type == "openai_response":
            direction = "in"
        else:
            direction = "out"
    else:
        direction = "out"
    
    # Determine transport
    transport = "http"  # A2A agents use HTTP
    if event_type == "openai_call" or event_type == "openai_response":
        transport = "http"  # OpenAI uses HTTP
    
    event = {
        "id": str(uuid4()),
        "timestamp": datetime.now().isoformat(),
        "source": source,
        "type": event_type,
        "hop": infer_hop(source, event_type, direction),
        "direction": direction,
        "transport": transport,
        "data": data,
    }
    
    # Add optional fields
    if a2a_message:
        event["a2a_schema"] = normalize_a2a_payload(a2a_message)
    if latency_ms is not None:
        event["latency_ms"] = latency_ms
    if status:
        event["status"] = status
    if error_origin:
        event["error_origin"] = error_origin
    
    await event_queue.put(event)
    print(f"[EventBroadcaster] Event added to queue: {event['id']}")
