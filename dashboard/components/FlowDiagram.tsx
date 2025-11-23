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

// Node positions
const NODES = {
    CLIENT: { x: 100, y: 300, label: 'Client' },
    MCP: { x: 300, y: 300, label: 'MCP Server' },
    RESEARCHER: { x: 500, y: 200, label: 'Researcher' },
    WRITER: { x: 500, y: 400, label: 'Writer' },
    OPENAI: { x: 700, y: 300, label: 'OpenAI' },
};

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
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-slate-950">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            <svg className="w-full h-full absolute inset-0 pointer-events-none">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
                    </marker>
                    <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                    </marker>
                </defs>

                {/* Connections */}
                <Connection from="CLIENT" to="MCP" active={isPathActive('client', 'mcp') || isPathActive('mcp', 'client')} transport="stdio" />
                <Connection from="MCP" to="RESEARCHER" active={isPathActive('mcp', 'researcher') || isPathActive('researcher', 'mcp')} transport="http" />
                <Connection from="RESEARCHER" to="WRITER" active={isPathActive('researcher', 'writer') || isPathActive('writer', 'researcher')} transport="http" />
                <Connection from="RESEARCHER" to="OPENAI" active={isPathActive('researcher', 'openai') || isPathActive('openai', 'researcher')} transport="http" />
                <Connection from="WRITER" to="OPENAI" active={isPathActive('writer', 'openai') || isPathActive('openai', 'writer')} transport="http" />
            </svg>

            {/* Nodes */}
            {Object.entries(NODES).map(([key, node]) => (
                <motion.div
                    key={key}
                    className="absolute w-36 h-20 rounded-xl border flex flex-col items-center justify-center font-bold text-sm shadow-xl z-10 backdrop-blur-sm"
                    style={{
                        left: node.x - 72,
                        top: node.y - 40,
                        backgroundColor: 'rgba(30, 41, 59, 0.8)', // Slate-800 with opacity
                        borderColor: getNodeColor(key),
                        color: '#f1f5f9'
                    }}
                    animate={{
                        scale: activeEvent?.source === key ? 1.1 : 1,
                        borderColor: getNodeColor(key),
                        boxShadow: activeEvent?.source === key ? '0 0 30px rgba(59, 130, 246, 0.4)' : '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <span className="z-10">{node.label}</span>
                    {/* Status Dot */}
                    {key !== 'CLIENT' && key !== 'OPENAI' && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full"
                            style={{
                                backgroundColor: isConnected[key as keyof typeof isConnected] ? '#10b981' : '#ef4444',
                                boxShadow: isConnected[key as keyof typeof isConnected] ? '0 0 8px #10b981' : 'none'
                            }}
                        />
                    )}
                </motion.div>
            ))}
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
                strokeWidth={active ? 3 : 2}
                strokeDasharray={transport === 'stdio' ? "5,5" : "none"}
                markerEnd={active ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                animate={{
                    stroke: active ? "#3b82f6" : "#475569",
                    strokeWidth: active ? 3 : 2
                }}
            />
            {active && (
                <motion.circle
                    r="6"
                    fill="#60a5fa"
                    style={{
                        offsetPath: `path("M${start.x},${start.y} L${end.x},${end.y}")`,
                        offsetDistance: "0%"
                    }}
                    animate={{
                        offsetDistance: "100%",
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
            )}
        </g>
    );
}
