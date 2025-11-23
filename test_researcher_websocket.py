"""
Test WebSocket event streaming from Researcher Agent
"""
import asyncio
import websockets
import json

async def test_researcher_websocket():
    uri = "ws://localhost:8001/events"
    
    print("Connecting to Researcher Agent WebSocket...")
    print(f"URI: {uri}\n")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")
            print("Listening for events...\n")
            print("=" * 60)
            
            # Listen for events
            event_count = 0
            async for message in websocket:
                event = json.loads(message)
                event_count += 1
                
                print(f"\n📡 Event #{event_count}")
                print(f"Type: {event['type']}")
                print(f"Source: {event['source']}")
                print(f"Hop: {event['hop']}")
                print(f"Transport: {event['transport']}")
                print(f"Timestamp: {event['timestamp']}")
                
                if 'latency_ms' in event:
                    print(f"Latency: {event['latency_ms']}ms")
                
                if 'a2a_schema' in event:
                    print(f"A2A Schema: {event['a2a_schema']}")
                
                if 'error_origin' in event:
                    print(f"❌ Error Origin: {event['error_origin']}")
                
                print(f"Data: {json.dumps(event['data'], indent=2)}")
                print("=" * 60)
                
    except ConnectionRefusedError:
        print("❌ Connection refused. Is the Researcher Agent running on port 8001?")
        print("\nStart it with:")
        print("  .venv\\Scripts\\python backend/researcher_agent.py")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("Researcher Agent WebSocket Test")
    print("=" * 60)
    asyncio.run(test_researcher_websocket())
