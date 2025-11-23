import asyncio
import sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def run():
    print("\n--- Protocol-Native Agent Demo ---")
    
    # Get topic from args or input
    if len(sys.argv) > 1:
        topic = sys.argv[1]
        print(f"Using topic from arguments: {topic}")
    else:
        topic = input("Enter the topic you want to research: ").strip()

    if not topic:
        print("No topic entered. Exiting.")
        return

    # Define server parameters
    server_params = StdioServerParameters(
        command=sys.executable,
        args=["mcp_server/server.py"],
        env=None
    )

    print(f"\n[Client] Connecting to MCP Server...")
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()

            # List available tools
            tools = await session.list_tools()
            if tools.tools:
                print(f"[Client] Connected. Found tool: {tools.tools[0].name}")
            else:
                print("[Client] Connected but no tools found.")

            # Call the agent tool
            print(f"[Client] Sending task to Agent Network: '{topic}'")
            print("[Client] Waiting for agents to complete work (this may take a few seconds)...\n")
            
            try:
                result = await session.call_tool("call_agent", arguments={"task": topic})
                print("\n" + "="*40)
                print("       FINAL AGENT OUTPUT       ")
                print("="*40 + "\n")
                
                # The result content is a list of TextContent or ImageContent
                for content in result.content:
                    if content.type == 'text':
                        print(content.text)
                    else:
                        print(f"[{content.type} content]")
                print("\n" + "="*40)
            except Exception as e:
                print(f"Error calling tool: {e}")

if __name__ == "__main__":
    asyncio.run(run())
