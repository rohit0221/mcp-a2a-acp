"use client";

import React, { useState, useEffect } from 'react';
import { useEventStream } from '@/hooks/useEventStream';
import { TraceTimeline } from '@/components/TraceTimeline';
import { FlowDiagram } from '@/components/FlowDiagram';
import { MessageInspector } from '@/components/MessageInspector';
import { EventStream } from '@/components/EventStream';
import { AgentEvent } from '@/lib/types';
import { Activity, Play, Trash2, Zap } from 'lucide-react';

export default function Dashboard() {
  const { events, isConnected, clearEvents } = useEventStream();
  const [selectedEvent, setSelectedEvent] = useState<AgentEvent | null>(null);
  const [activeEvent, setActiveEvent] = useState<AgentEvent | undefined>(undefined);

  // Auto-select latest event for flow diagram animation
  useEffect(() => {
    if (events.length > 0) {
      const latest = events[events.length - 1];
      setActiveEvent(latest);

      // Clear active animation after 2 seconds
      const timer = setTimeout(() => {
        setActiveEvent(undefined);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [events]);

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-200 flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-900/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white">
              A2A <span className="text-slate-500 font-medium">Visualization</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System Monitor
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Connection Status */}
          <div className="flex items-center gap-4 text-xs font-medium bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50">
            <StatusBadge label="MCP Server" connected={isConnected.MCP} />
            <div className="w-px h-3 bg-slate-700" />
            <StatusBadge label="Researcher" connected={isConnected.RESEARCHER} />
            <div className="w-px h-3 bg-slate-700" />
            <StatusBadge label="Writer" connected={isConnected.WRITER} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={clearEvents}
              className="p-2.5 hover:bg-red-950/30 rounded-lg text-slate-400 hover:text-red-400 transition-all border border-transparent hover:border-red-900/30"
              title="Clear Events"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              className="flex items-center gap-2 bg-white text-slate-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-all shadow-lg shadow-blue-900/10 active:scale-95"
            >
              <Play className="w-4 h-4 text-blue-600" />
              Start Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Left: Timeline */}
        <div className="w-96 shrink-0 z-20 shadow-2xl">
          <TraceTimeline
            events={events}
            onSelectEvent={setSelectedEvent}
            selectedEventId={selectedEvent?.id}
          />
        </div>

        {/* Center: Flow & Stream */}
        <div className="flex-1 flex flex-col relative z-10">
          <div className="flex-1 relative">
            <FlowDiagram activeEvent={activeEvent} isConnected={isConnected} />

            {/* Overlay Title */}
            <div className="absolute top-6 left-6 pointer-events-none">
              <h2 className="text-2xl font-bold text-slate-200/20 tracking-tight">System Architecture</h2>
            </div>
          </div>

          <div className="h-64 border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm">
            <EventStream events={events} />
          </div>
        </div>

        {/* Right: Inspector */}
        <div className="w-[450px] shrink-0 z-20 shadow-2xl border-l border-slate-800">
          <MessageInspector
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full transition-all duration-500 ${connected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} />
      <span className={connected ? 'text-slate-300' : 'text-slate-500'}>{label}</span>
    </div>
  );
}
