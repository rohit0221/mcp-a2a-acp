export const SAMPLE_EVENTS = [
    {
        id: "1",
        timestamp: new Date().toISOString(),
        hop: "client→mcp",
        direction: "out" as const,
        transport: "stdio" as const,
        source: "MCP" as const,
        type: "mcp_tool_call" as const,
        data: { tool: "call_agent", arguments: { task: "Research vector databases" } }
    },
    {
        id: "2",
        timestamp: new Date(Date.now() + 3000).toISOString(),
        hop: "mcp→researcher",
        direction: "out" as const,
        transport: "http" as const,
        source: "MCP" as const,
        type: "a2a_outgoing" as const,
        data: { message: "Forwarding research task to Researcher Agent" }
    },
    {
        id: "3",
        timestamp: new Date(Date.now() + 6000).toISOString(),
        hop: "researcher→openai",
        direction: "out" as const,
        transport: "http" as const,
        source: "RESEARCHER" as const,
        type: "openai_call" as const,
        data: { model: "gpt-4o-mini", prompt: "Research vector databases" },
        status: "pending" as const
    },
    {
        id: "4",
        timestamp: new Date(Date.now() + 12000).toISOString(),
        hop: "openai→researcher",
        direction: "in" as const,
        transport: "http" as const,
        source: "OPENAI" as const,
        type: "openai_response" as const,
        data: { content: "Vector databases are specialized..." },
        status: "success" as const,
        latency_ms: 6000
    },
    {
        id: "5",
        timestamp: new Date(Date.now() + 15000).toISOString(),
        hop: "researcher→writer",
        direction: "out" as const,
        transport: "http" as const,
        source: "RESEARCHER" as const,
        type: "a2a_outgoing" as const,
        data: { message: "Sending research findings to Writer Agent" }
    },
    {
        id: "6",
        timestamp: new Date(Date.now() + 18000).toISOString(),
        hop: "writer→openai",
        direction: "out" as const,
        transport: "http" as const,
        source: "WRITER" as const,
        type: "openai_call" as const,
        data: { model: "gpt-4o-mini", prompt: "Write report on vector databases" },
        status: "pending" as const
    },
    {
        id: "7",
        timestamp: new Date(Date.now() + 24000).toISOString(),
        hop: "openai→writer",
        direction: "in" as const,
        transport: "http" as const,
        source: "OPENAI" as const,
        type: "openai_response" as const,
        data: { content: "# Vector Databases Report\n\nVector databases..." },
        status: "success" as const,
        latency_ms: 6000
    },
    {
        id: "8",
        timestamp: new Date(Date.now() + 27000).toISOString(),
        hop: "writer→researcher",
        direction: "in" as const,
        transport: "http" as const,
        source: "WRITER" as const,
        type: "a2a_incoming" as const,
        data: { message: "Report completed" }
    },
    {
        id: "9",
        timestamp: new Date(Date.now() + 30000).toISOString(),
        hop: "mcp→client",
        direction: "in" as const,
        transport: "stdio" as const,
        source: "MCP" as const,
        type: "mcp_tool_result" as const,
        data: {
            content_length: 500,
            content: `# Vector Databases: A Comprehensive Overview

## Introduction
Vector databases are specialized database systems designed to store, index, and query high-dimensional vector embeddings efficiently.

## Key Features
- **Similarity Search**: Fast nearest neighbor search
- **Scalability**: Handle billions of vectors
- **Integration**: Works with ML/AI pipelines

## Popular Solutions
1. **Pinecone**: Managed vector database
2. **Weaviate**: Open-source with GraphQL
3. **Milvus**: Highly scalable, open-source

## Use Cases
- Semantic search
- Recommendation systems
- Image/video similarity
- Anomaly detection

## Conclusion
Vector databases are essential for modern AI applications requiring semantic understanding and similarity matching.`
        }
    }
];
