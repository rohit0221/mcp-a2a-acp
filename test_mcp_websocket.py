"""
Test WebSocket event streaming from MCP Server
"""
import asyncio
import websockets
import json

async def test_mcp_websocket():
    uri = "ws://localhost:9000/events"
    
    print("Connecting to MCP Server WebSocket...")
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
                
                print(f"Data: {json.dumps(event['data'], indent=2)}")
                print("=" * 60)
                
    except ConnectionRefusedError:
        print("❌ Connection refused. Is the MCP Server running?")
        print("Note: The MCP Server is usually run by the client via stdio.")
        print("To test this, you need to run the demo client which starts the MCP server.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("MCP Server WebSocket Test")
    print("=" * 60)
    asyncio.run(test_mcp_websocket())
