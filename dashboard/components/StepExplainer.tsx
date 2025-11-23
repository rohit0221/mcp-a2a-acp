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
                title: "Client Request",
                desc: "The client sends your research topic to the MCP Server via Stdio.",
                icon: <Terminal className="w-5 h-5 text-slate-400" />
            };
            if (hop === 'mcp→client') return {
                title: "Task Complete",
                desc: "The MCP Server returns the final report to the Client.",
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            };

            // MCP <-> Researcher
            if (hop === 'mcp→researcher') return {
                title: "Delegating to Researcher",
                desc: "MCP Server identifies the 'call_agent' tool and forwards the task to the Researcher Agent.",
                icon: <BrainCircuit className="w-5 h-5 text-blue-400" />
            };
            if (hop === 'researcher→mcp') return {
                title: "Research Complete",
                desc: "Researcher Agent sends the final compiled report back to the MCP Server.",
                icon: <CheckCircle2 className="w-5 h-5 text-blue-400" />
            };

            // Researcher <-> OpenAI
            if (hop === 'researcher→openai') return {
                title: "Conducting Research",
                desc: "Researcher Agent queries OpenAI (GPT-4o) to gather information on the topic.",
                icon: <BrainCircuit className="w-5 h-5 text-purple-400" />
            };
            if (hop === 'openai→researcher') return {
                title: "Analyzing Data",
                desc: "OpenAI returns research findings. The Researcher Agent analyzes this data.",
                icon: <BrainCircuit className="w-5 h-5 text-purple-400" />
            };

            // Researcher <-> Writer
            if (hop === 'researcher→writer') return {
                title: "Requesting Draft",
                desc: "Researcher Agent sends the analyzed notes to the Writer Agent via A2A Protocol.",
                icon: <PenTool className="w-5 h-5 text-indigo-400" />
            };
            if (hop === 'writer→researcher') return {
                title: "Draft Received",
                desc: "Writer Agent returns the formatted markdown report to the Researcher.",
                icon: <PenTool className="w-5 h-5 text-indigo-400" />
            };

            // Writer <-> OpenAI
            if (hop === 'writer→openai') return {
                title: "Writing Report",
                desc: "Writer Agent asks OpenAI to compose a professional report based on the research notes.",
                icon: <PenTool className="w-5 h-5 text-indigo-400" />
            };
            if (hop === 'openai→writer') return {
                title: "Report Generated",
                desc: "OpenAI returns the written content. Writer Agent finalizes the document.",
                icon: <PenTool className="w-5 h-5 text-indigo-400" />
            };

            return {
                title: "System Event",
                desc: `Processing event: ${e.type}`,
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
