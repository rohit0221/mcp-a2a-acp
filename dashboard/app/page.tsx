"use client";

import React, { useState, useEffect } from 'react';
import { useEventStream } from '@/hooks/useEventStream';
import { TraceTimeline } from '@/components/TraceTimeline';
import { FlowDiagram } from '@/components/FlowDiagram';
import { MessageInspector } from '@/components/MessageInspector';
import { EventStream } from '@/components/EventStream';
import { AgentEvent } from '@/lib/types';
import { Activity, Play, Trash2, GripVertical } from 'lucide-react';
import {
  PanelResizeHandle,
  Panel,
  PanelGroup,
} from "react-resizable-panels";

import { StartDemoModal } from '@/components/StartDemoModal';
import { StepExplainer } from '@/components/StepExplainer';

import { FinalReportModal } from '@/components/FinalReportModal';

export default function Dashboard() {
  const { lastEvent, isConnected, clearEvents } = useEventStream();
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AgentEvent | null>(null);
  const [activeEvent, setActiveEvent] = useState<AgentEvent | undefined>(undefined);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Final Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [finalReportContent, setFinalReportContent] = useState('');

  // Auto-select latest event for flow diagram animation ONLY if no event is explicitly selected
  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      const latest = events[events.length - 1];
      setActiveEvent(latest);

      const timer = setTimeout(() => {
        setActiveEvent(undefined);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [events, selectedEvent]);

  useEffect(() => {
    if (lastEvent) {
      setEvents((prev) => {
        // Prevent duplicates if lastEvent didn't change (though hook handles this, safety check)
        if (prev.some(e => e.id === lastEvent.id)) return prev;
        return [...prev, lastEvent];
      });

      // Set active event for visualization
      setActiveEvent(lastEvent);

      // Check for final output
      if (lastEvent.hop === 'mcp→client' && lastEvent.type === 'mcp_tool_result') {
        console.log('Final event detected:', lastEvent);
        console.log('Event data:', lastEvent.data);

        if (lastEvent.data && lastEvent.data.content) {
          console.log('Opening final report modal with content length:', lastEvent.data.content.length);
          // Delay modal opening to ensure the event is visible first
          setTimeout(() => {
            setFinalReportContent(lastEvent.data.content);
            setIsReportModalOpen(true);
          }, 2000); // 2 second delay to let user see the final event
        } else {
          console.warn('No content found in final event data');
        }
      }
    }
  }, [lastEvent]);

  // If an event is selected, force it as the active event for the diagram
  const displayEvent = selectedEvent || activeEvent;

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-200 flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
      <StartDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
      <FinalReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        content={finalReportContent}
      />

      {/* Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-md z-50 shrink-0">
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
          <div className="flex items-center gap-4 text-xs font-medium bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50">
            <StatusBadge label="MCP Server" connected={isConnected.MCP} />
            <div className="w-px h-3 bg-slate-700" />
            <StatusBadge label="Researcher" connected={isConnected.RESEARCHER} />
            <div className="w-px h-3 bg-slate-700" />
            <StatusBadge label="Writer" connected={isConnected.WRITER} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={clearEvents}
              className="p-2.5 hover:bg-red-950/30 rounded-lg text-slate-400 hover:text-red-400 transition-all border border-transparent hover:border-red-900/30"
              title="Clear Events"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="flex items-center gap-2 bg-white text-slate-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-all shadow-lg shadow-blue-900/10 active:scale-95"
            >
              <Play className="w-4 h-4 text-blue-600" />
              Start Demo
            </button>
          </div>
        </div>
      </header>

      {/* Resizable Main Content */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">

          {/* Left: Timeline */}
          <Panel defaultSize={20} minSize={15} maxSize={30} className="bg-slate-900/30">
            <TraceTimeline
              events={events}
              onSelectEvent={setSelectedEvent}
              selectedEventId={selectedEvent?.id}
              activeEventId={activeEvent?.id}
            />
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-slate-900 hover:bg-blue-500/50 transition-colors flex items-center justify-center group">
            <GripVertical className="w-3 h-3 text-slate-700 group-hover:text-blue-400" />
          </PanelResizeHandle>

          {/* Center: Flow & Stream */}
          <Panel defaultSize={55} minSize={30}>
            <PanelGroup direction="vertical">

              {/* Flow Diagram */}
              <Panel defaultSize={75} minSize={30} className="relative">
                <StepExplainer event={displayEvent || null} />
                <FlowDiagram activeEvent={displayEvent} isConnected={isConnected} />
                <div className="absolute top-6 left-6 pointer-events-none">
                  <h2 className="text-2xl font-bold text-slate-200/20 tracking-tight">System Architecture</h2>
                </div>
              </Panel>

              <PanelResizeHandle className="h-1.5 bg-slate-900 hover:bg-blue-500/50 transition-colors flex items-center justify-center group">
                <div className="w-8 h-1 rounded-full bg-slate-700 group-hover:bg-blue-400" />
              </PanelResizeHandle>

              {/* Event Stream */}
              <Panel defaultSize={25} minSize={10} className="bg-slate-950/80 backdrop-blur-sm border-t border-slate-800">
                <EventStream events={events} />
              </Panel>

            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-slate-900 hover:bg-blue-500/50 transition-colors flex items-center justify-center group">
            <GripVertical className="w-3 h-3 text-slate-700 group-hover:text-blue-400" />
          </PanelResizeHandle>

          {/* Right: Inspector */}
          <Panel defaultSize={25} minSize={20} maxSize={40} className="bg-slate-900/50 border-l border-slate-800">
            <MessageInspector
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          </Panel>

        </PanelGroup>
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
