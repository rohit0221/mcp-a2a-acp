# MCP + A2A Multi-Agent POC

A demonstration of **MCP** (Model Context Protocol) and **A2A** (Agent-to-Agent) protocols working together with true multi-agent communication.

## Architecture

```
MCP Client → MCP Server → Researcher Agent (A2A) → Writer Agent (A2A)
```

### Components

1. **MCP Client** (`demo_client.py`) - LLM interface using MCP protocol
2. **MCP Server** (`mcp_server/server.py`) - Exposes `call_agent` tool
3. **Researcher Agent** (port 8001) - A2A agent that researches topics
4. **Writer Agent** (port 8002) - A2A agent that drafts reports

### True A2A Communication

- Researcher and Writer are **independent A2A servers**
- Each has its own **AgentCard** at `/.well-known/agent-card.json`
- Researcher calls Writer via **A2AClient** (HTTP/JSON-RPC)
- **No shared Python classes** - only A2A protocol messages

## Setup

```bash
# Install dependencies
uv sync

# Create .env file
cp .env.example .env
# Add your OPENAI_API_KEY
```

## Running

You need **3 terminals**:

### Terminal 1: Writer Agent
```bash
.venv\Scripts\python backend/writer_agent.py
```
Starts on `http://localhost:8002`

### Terminal 2: Researcher Agent
```bash
.venv\Scripts\python backend/researcher_agent.py
```
Starts on `http://localhost:8001`

### Terminal 3: MCP Client
```bash
.venv\Scripts\python demo_client.py
```

## How It Works

1. **User** enters a topic (e.g., "quantum computing")
2. **MCP Client** calls `call_agent` tool
3. **MCP Server** sends A2A message to **Researcher Agent**
4. **Researcher Agent**:
   - Calls OpenAI to research the topic
   - Sends notes to **Writer Agent** via A2A
5. **Writer Agent**:
   - Receives topic + notes via A2A
   - Calls OpenAI to draft markdown report
   - Returns report via A2A
6. **Researcher Agent** forwards report to MCP Server
7. **MCP Client** displays the final report

## Verification

### Check AgentCards

```bash
# Writer Agent
curl http://localhost:8002/.well-known/agent-card.json

# Researcher Agent  
curl http://localhost:8001/.well-known/agent-card.json
```

### Watch the Logs

You'll see A2A communication in the logs:
- `[Researcher] Calling Writer Agent via A2A...`
- `[Writer] Received topic: '...'`
- `[Writer] Drafting report...`
- `[Researcher] Received report from Writer`

## Key Features

✅ **Protocol Compliance**: Uses official `a2a-sdk` and `mcp` SDKs
✅ **True Multi-Agent**: Two independent A2A servers
✅ **A2A Communication**: Researcher → Writer via HTTP/JSON-RPC
✅ **AgentCards**: Proper A2A discovery mechanism
✅ **Conference Ready**: Clean architecture for demos

## Dependencies

- `a2a-sdk[http-server]` - A2A protocol implementation
- `mcp` - MCP protocol implementation  
- `openai` - LLM integration
- `httpx` - HTTP client for A2A calls
- `uvicorn` - ASGI server
