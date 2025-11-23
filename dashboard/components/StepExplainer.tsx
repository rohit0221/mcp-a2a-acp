import React, { useEffect, useState } from 'react';
import { AgentEvent } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, CheckCircle2, AlertCircle, BrainCircuit, PenTool, Terminal } from 'lucide-react';

interface StepExplainerProps {
    event: AgentEvent | null;
}

export function StepExplainer({ event }: StepExplainerProps) {
    const [message, setMessage] = useState<{ title: string; desc: string; icon: React.ReactNode } | null>(null);

    useEffect(() => {
        if (!event) return;

        const getExplanation = (e: AgentEvent) => {
            const hop = e.hop.toLowerCase();

            // Client <-> MCP
            if (hop === 'client→mcp') return {
                title: "Client Request (Stdio)",
                desc: "The client sends a JSON-RPC request via standard input/output to the MCP Server. Check 'Raw JSON' to see the full request payload.",
                icon: <Terminal className="w-5 h-5 text-slate-400" />
            };
            if (hop === 'mcp→client') return {
                title: "Task Complete (Stdio)",
                desc: "The MCP Server returns the final JSON-RPC response to the Client via standard output. The 'result' field contains the agent's report.",
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            };

            // MCP <-> Researcher
            if (hop === 'mcp→researcher') return {
                title: "Tool Call Routing (HTTP)",
                desc: "MCP Server identifies the 'call_agent' tool and routes the request to the Researcher Agent via HTTP POST. Inspect 'A2A Payload' for the tool arguments.",
                icon: <BrainCircuit className="w-5 h-5 text-blue-400" />
            };
            if (hop === 'researcher→mcp') return {
                title: "Research Complete (HTTP)",
                desc: "Researcher Agent returns the final report as a tool result via HTTP response. Check 'Summary' for the content length and status.",
                icon: <CheckCircle2 className="w-5 h-5 text-blue-400" />
            };

            // Researcher <-> OpenAI
            if (hop === 'researcher→openai') return {
                title: "LLM Inference (API)",
                desc: "Researcher Agent constructs a prompt and calls the OpenAI API (GPT-4o) to gather information. View 'Raw JSON' for the exact prompt sent.",
                icon: <BrainCircuit className="w-5 h-5 text-purple-400" />
            };
            if (hop === 'openai→researcher') return {
                title: "Data Analysis (API)",
                desc: "OpenAI returns the completion. The Researcher Agent parses this response to extract key findings. Inspect 'Event Data' for token usage.",
                icon: <BrainCircuit className="w-5 h-5 text-purple-400" />
            };

            // Researcher <-> Writer
            if (hop === 'researcher→writer') return {
                title: "A2A Delegation (HTTP)",
                desc: "Researcher Agent calls the Writer Agent using the A2A Protocol (HTTP POST). It passes the research notes as context. Check 'A2A Payload' for the transferred notes.",
                icon: <PenTool className="w-5 h-5 text-indigo-400" />
            };
            if (hop === 'writer→researcher') return {
                title: "Draft Received (HTTP)",
                desc: "Writer Agent returns the formatted markdown report via HTTP response. The Researcher will now finalize the task.",
                icon: <PenTool className="w-5 h-5 text-indigo-400" />
            };

            // Writer <-> OpenAI
            if (hop === 'writer→openai') return {
                title: "Content Generation (API)",
                desc: "Writer Agent asks OpenAI to synthesize the research notes into a polished report. View 'Raw JSON' to see the system prompt used for writing.",
                icon: <PenTool className="w-5 h-5 text-indigo-400" />
            };
            if (hop === 'openai→writer') return {
                title: "Report Generated (API)",
                desc: "OpenAI streams the generated markdown back to the Writer Agent. The agent captures this content for the final response.",
                icon: <PenTool className="w-5 h-5 text-indigo-400" />
            };

            return {
                title: "System Event",
                desc: `Processing event type: ${e.type}. Click on this event in the timeline to inspect its full payload.`,
                icon: <Info className="w-5 h-5 text-slate-400" />
            };
        };

        setMessage(getExplanation(event));

        // Auto-dismiss after 4 seconds
        const timer = setTimeout(() => setMessage(null), 4000);
        return () => clearTimeout(timer);
    }, [event]);

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="absolute top-6 left-1/2 -translate-x-1/2 z-50"
                >
                    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl p-4 flex items-start gap-4 w-[400px]">
                        <div className="bg-slate-800/50 p-2 rounded-xl shrink-0">
                            {message.icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-100 text-sm mb-1">{message.title}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">{message.desc}</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
