export type EventSource = "MCP" | "RESEARCHER" | "WRITER" | "OPENAI";
export type EventType =
    | "rpc_request"
    | "rpc_response"
    | "a2a_outgoing"
    | "a2a_incoming"
    | "mcp_tool_call"
    | "mcp_tool_result"
    | "openai_call"
    | "openai_response"
    | "error";

export type TransportType = "stdio" | "http" | "websocket";
export type Direction = "in" | "out";

export interface A2ASchema {
    message_id?: string;
    role?: string;
    parts: Array<{
        kind: string;
        text?: string;
    }>;
}

export interface ErrorOrigin {
    component: string;
    phase: string;
    stack?: string;
}

export interface AgentEvent {
    id: string;
    timestamp: string;
    hop: string;
    direction: Direction;
    transport: TransportType;
    source: EventSource;
    type: EventType;
    data: any;
    latency_ms?: number;
    status?: "pending" | "success" | "error";
    error_origin?: ErrorOrigin;
    a2a_schema?: A2ASchema;
}
