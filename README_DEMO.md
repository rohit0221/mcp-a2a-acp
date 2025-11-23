# MCP-A2A Visualization Demo

This project demonstrates a multi-agent system using the **Model Context Protocol (MCP)** and **Agent-to-Agent (A2A)** protocol, visualized in real-time.

## System Architecture

- **MCP Server (Port 9000)**: Entry point for the client. Delegates tasks to the agent network.
- **Researcher Agent (Port 8001)**: Researches topics using OpenAI. Calls Writer Agent.
- **Writer Agent (Port 8002)**: Drafts reports based on research notes.
- **Dashboard (Port 3000)**: Real-time visualization of the agent interactions.

## Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API Key (in `.env`)

## Quick Start

1. **Start the System**:
   Double-click `start_all.bat` or run:
   ```bash
   .\start_all.bat
   ```

2. **Open the Dashboard**:
   Go to [http://localhost:3000](http://localhost:3000)

3. **Run the Demo Client**:
   In a new terminal:
   ```bash
   .venv\Scripts\python demo_client.py
   ```
   Enter a topic (e.g., "quantum computing") and watch the dashboard!

## Dashboard Features

- **Trace Timeline**: See every event (RPC, A2A, OpenAI) in chronological order.
- **Flow Diagram**: Visualizes active connections and data flow between agents.
- **Message Inspector**: Click any event to see detailed payloads, including A2A schemas.
- **Real-Time Logs**: Raw event stream for debugging.
