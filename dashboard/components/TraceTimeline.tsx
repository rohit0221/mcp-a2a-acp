import React, { useRef, useEffect } from 'react';
import { AgentEvent } from '@/lib/types';
import { format } from 'date-fns';
import {
    ArrowRight,
    Bot,
    Database,
    Globe,
    MessageSquare,
    Terminal,
    AlertCircle,
    Clock,
    Cpu,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TraceTimelineProps {
    events: AgentEvent[];
    onSelectEvent: (event: AgentEvent) => void;
    selectedEventId?: string;
}

export function TraceTimeline({ events, onSelectEvent, selectedEventId }: TraceTimelineProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events]);

    const getIcon = (event: AgentEvent) => {
        switch (event.source) {
            case 'MCP': return <Terminal className="w-5 h-5 text-emerald-400" />;
            case 'RESEARCHER': return <Bot className="w-5 h-5 text-blue-400" />;
            case 'WRITER': return <Bot className="w-5 h-5 text-indigo-400" />;
            case 'OPENAI': return <Cpu className="w-5 h-5 text-purple-400" />;
            default: return <MessageSquare className="w-5 h-5" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50 border-r border-slate-800 backdrop-blur-sm">
            <div className="p-4 border-b border-slate-800 font-bold text-slate-200 flex justify-between items-center bg-slate-900/80">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>Live Trace</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {events.length}
                </span>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {events.map((event) => (
                    <div
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className={cn(
                            "p-4 rounded-xl cursor-pointer transition-all border shadow-sm relative overflow-hidden group",
                            selectedEventId === event.id
                                ? "bg-blue-900/20 border-blue-500/50 shadow-blue-900/20"
                                : "bg-slate-800/40 hover:bg-slate-800/60 border-slate-700/50 hover:border-slate-600"
                        )}
                    >
                        {/* Active Indicator */}
                        {selectedEventId === event.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                        )}

                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                    event.source === 'MCP' && "bg-emerald-900/30 text-emerald-400 border border-emerald-500/20",
                                    event.source === 'RESEARCHER' && "bg-blue-900/30 text-blue-400 border border-blue-500/20",
                                    event.source === 'WRITER' && "bg-indigo-900/30 text-indigo-400 border border-indigo-500/20",
                                    event.source === 'OPENAI' && "bg-purple-900/30 text-purple-400 border border-purple-500/20"
                                )}>
                                    {event.source}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                    {format(new Date(event.timestamp), 'HH:mm:ss.SSS')}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-slate-200 font-semibold text-base mb-2">
                            {getIcon(event)}
                            <span>{event.type}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
                            <span className="font-mono text-slate-500">{event.hop.split('→')[0]}</span>
                            <ArrowRight className="w-3 h-3 text-slate-600" />
                            <span className="font-mono text-slate-300">{event.hop.split('→')[1]}</span>
                        </div>

                        {event.latency_ms && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-500/90 font-medium">
                                <Clock className="w-3 h-3" />
                                <span>{event.latency_ms}ms</span>
                            </div>
                        )}

                        {event.type === 'error' && (
                            <div className="mt-3 text-xs text-red-300 flex items-start gap-2 bg-red-950/30 p-2 rounded border border-red-900/50">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                                <span className="break-words">{event.data.message}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
