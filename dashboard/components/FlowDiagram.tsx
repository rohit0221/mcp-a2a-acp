import React from 'react';
import { motion } from 'framer-motion';
import { AgentEvent } from '@/lib/types';

interface FlowDiagramProps {
    activeEvent?: AgentEvent;
    isConnected: {
        WRITER: boolean;
        RESEARCHER: boolean;
        MCP: boolean;
    };
}

// Node positions (Center points)
const NODES = {
    CLIENT: { x: 150, y: 450, label: 'Client' },
    MCP: { x: 450, y: 450, label: 'MCP Server' },
    RESEARCHER: { x: 750, y: 300, label: 'Researcher' },
    WRITER: { x: 750, y: 600, label: 'Writer' },
    OPENAI: { x: 1050, y: 450, label: 'OpenAI' },
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;

export function FlowDiagram({ activeEvent, isConnected }: FlowDiagramProps) {

    const getNodeColor = (node: string) => {
        if (activeEvent?.source === node) return '#3b82f6'; // Active blue

        // Connection status colors
        if (node === 'MCP' && isConnected.MCP) return '#10b981';
        if (node === 'RESEARCHER' && isConnected.RESEARCHER) return '#10b981';
        if (node === 'WRITER' && isConnected.WRITER) return '#10b981';

        return '#374151'; // Default gray
    };

    const isPathActive = (from: string, to: string) => {
        if (!activeEvent) return false;
        const hop = activeEvent.hop.toLowerCase();
        const path = `${from}→${to}`.toLowerCase();
        return hop === path;
    };

    return (
        <div className="w-full h-full bg-slate-950 relative overflow-hidden flex items-center justify-center">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}
            />

            {/* 
        Unified SVG Container 
        Using viewBox allows the entire diagram (nodes + lines) to scale uniformly.
        foreignObject allows us to embed HTML (the styled divs) inside the SVG coordinate space.
      */}
            <svg
                className="w-full h-full"
                viewBox="0 0 1200 900"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
                    </marker>
                    <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                    </marker>
                </defs>

                {/* Connections (Rendered first so they appear behind nodes) */}
                <Connection from="CLIENT" to="MCP" active={isPathActive('client', 'mcp') || isPathActive('mcp', 'client')} transport="stdio" />
                <Connection from="MCP" to="RESEARCHER" active={isPathActive('mcp', 'researcher') || isPathActive('researcher', 'mcp')} transport="http" />
                <Connection from="RESEARCHER" to="WRITER" active={isPathActive('researcher', 'writer') || isPathActive('writer', 'researcher')} transport="http" />
                <Connection from="RESEARCHER" to="OPENAI" active={isPathActive('researcher', 'openai') || isPathActive('openai', 'researcher')} transport="http" />
                <Connection from="WRITER" to="OPENAI" active={isPathActive('writer', 'openai') || isPathActive('openai', 'writer')} transport="http" />

                {/* Nodes (Rendered via foreignObject to stay in sync with SVG coordinates) */}
                {Object.entries(NODES).map(([key, node]) => (
                    <foreignObject
                        key={key}
                        x={node.x - (NODE_WIDTH / 2)}
                        y={node.y - (NODE_HEIGHT / 2)}
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                        className="overflow-visible" // Allow shadows/animations to spill out
                    >
                        <motion.div
                            className="w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center font-bold text-base shadow-2xl backdrop-blur-md"
                            style={{
                                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                                borderColor: getNodeColor(key),
                                color: '#f1f5f9'
                            }}
                            animate={{
                                scale: activeEvent?.source === key ? 1.1 : 1,
                                borderColor: getNodeColor(key),
                                boxShadow: activeEvent?.source === key ? '0 0 40px rgba(59, 130, 246, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <span className="z-10 text-lg tracking-wide">{node.label}</span>

                            {/* Status Dot */}
                            {key !== 'CLIENT' && key !== 'OPENAI' && (
                                <div className="absolute top-3 right-3 w-3 h-3 rounded-full"
                                    style={{
                                        backgroundColor: isConnected[key as keyof typeof isConnected] ? '#10b981' : '#ef4444',
                                        boxShadow: isConnected[key as keyof typeof isConnected] ? '0 0 10px #10b981' : 'none'
                                    }}
                                />
                            )}
                        </motion.div>
                    </foreignObject>
                ))}
            </svg>
        </div>
    );
}

function Connection({ from, to, active, transport }: { from: string; to: string; active: boolean; transport: string }) {
    const start = NODES[from as keyof typeof NODES];
    const end = NODES[to as keyof typeof NODES];

    return (
        <g>
            <motion.line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={active ? "#3b82f6" : "#475569"}
                strokeWidth={active ? 4 : 2}
                strokeDasharray={transport === 'stdio' ? "8,8" : "none"}
                markerEnd={active ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                animate={{
                    stroke: active ? "#3b82f6" : "#475569",
                    strokeWidth: active ? 4 : 2
                }}
            />
            {active && (
                <motion.circle
                    r="8"
                    fill="#60a5fa"
                    style={{
                        offsetPath: `path("M${start.x},${start.y} L${end.x},${end.y}")`,
                        offsetDistance: "0%"
                    }}
                    animate={{
                        offsetDistance: "100%",
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
            )}
        </g>
    );
}
