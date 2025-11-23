import React, { useState } from 'react';
import { AgentEvent } from '@/lib/types';
import { X, Code, FileText, AlertTriangle, MessageSquare, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInspectorProps {
    event: AgentEvent | null;
    onClose: () => void;
}

export function MessageInspector({ event, onClose }: MessageInspectorProps) {
    const [activeTab, setActiveTab] = useState<'summary' | 'payload' | 'raw'>('summary');

    if (!event) {
        return (
            <div className="h-full flex items-center justify-center text-slate-500 bg-slate-900/50 border-l border-slate-800 backdrop-blur-sm">
                <div className="text-center p-6">
                    <div className="bg-slate-800/50 p-4 rounded-full inline-block mb-4">
                        <FileText className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Select an event to inspect details</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-900/90 border-l border-slate-800 backdrop-blur-md shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-100 text-lg">{event.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span>ID: {event.id.slice(0, 8)}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span>{event.timestamp}</span>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900/30">
                <Tab
                    label="Summary"
                    icon={<Layers className="w-4 h-4" />}
                    active={activeTab === 'summary'}
                    onClick={() => setActiveTab('summary')}
                />
                {event.a2a_schema && (
                    <Tab
                        label="A2A Payload"
                        icon={<MessageSquare className="w-4 h-4" />}
                        active={activeTab === 'payload'}
                        onClick={() => setActiveTab('payload')}
                    />
                )}
                <Tab
                    label="Raw JSON"
                    icon={<Code className="w-4 h-4" />}
                    active={activeTab === 'raw'}
                    onClick={() => setActiveTab('raw')}
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {activeTab === 'summary' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <MetaCard label="Source" value={event.source} />
                            <MetaCard label="Transport" value={event.transport} />
                            <MetaCard label="Hop" value={event.hop} />
                            <MetaCard label="Latency" value={event.latency_ms ? `${event.latency_ms}ms` : '-'} />
                        </div>

                        {/* Error Details */}
                        {event.error_origin && (
                            <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3 text-red-400 font-semibold">
                                    <AlertTriangle className="w-4 h-4" />
                                    Error Origin
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between border-b border-red-900/30 pb-2">
                                        <span className="text-slate-400">Component</span>
                                        <span className="text-red-300 font-mono">{event.error_origin.component}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-red-900/30 pb-2">
                                        <span className="text-slate-400">Phase</span>
                                        <span className="text-red-300 font-mono">{event.error_origin.phase}</span>
                                    </div>
                                    {event.error_origin.stack && (
                                        <div className="mt-2">
                                            <div className="text-slate-400 mb-2 text-xs uppercase tracking-wider font-semibold">Stack Trace</div>
                                            <pre className="text-[10px] bg-black/40 p-3 rounded-lg overflow-x-auto text-red-300/80 font-mono leading-relaxed border border-red-900/20">
                                                {event.error_origin.stack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Quick Data View */}
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Event Data</div>
                            <pre className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 overflow-x-auto font-mono">
                                {JSON.stringify(event.data, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}

                {activeTab === 'payload' && event.a2a_schema && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4">
                            <div className="flex justify-between mb-4 text-xs text-slate-400 border-b border-blue-900/30 pb-2">
                                <span className="font-mono">ID: {event.a2a_schema.message_id}</span>
                                <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 font-medium uppercase">{event.a2a_schema.role}</span>
                            </div>
                            <div className="space-y-3">
                                {event.a2a_schema.parts.map((part, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="text-[10px] text-blue-400/60 uppercase tracking-wider font-semibold pl-1">{part.kind}</div>
                                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 text-slate-300 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                                            {part.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'raw' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 h-full">
                        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-emerald-400/90 overflow-x-auto font-mono h-full">
                            {JSON.stringify(event, null, 2)}
                        </pre>
                    </div>
                )}

            </div>
        </div>
    );
}

function Tab({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2",
                active
                    ? "border-blue-500 text-blue-400 bg-blue-950/10"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
            )}
        >
            {icon}
            {label}
        </button>
    );
}

function MetaCard({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
            <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">{label}</div>
            <div className="font-medium text-slate-200 text-sm truncate" title={String(value)}>{value}</div>
        </div>
    );
}
