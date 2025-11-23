import React, { useRef, useEffect } from 'react';
import { AgentEvent } from '@/lib/types';
import { format } from 'date-fns';

interface EventStreamProps {
    events: AgentEvent[];
}

export function EventStream({ events }: EventStreamProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events]);

    return (
        <div className="h-full flex flex-col bg-black font-mono text-xs">
            <div className="p-2 border-b border-gray-800 text-gray-400 font-semibold">
                Raw Event Stream
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
                {events.map((event) => (
                    <div key={event.id} className="flex gap-2 text-gray-500 hover:bg-gray-900 p-0.5 rounded">
                        <span className="text-gray-600 shrink-0">
                            {format(new Date(event.timestamp), 'HH:mm:ss.SSS')}
                        </span>
                        <span className={
                            event.source === 'MCP' ? 'text-gray-400' :
                                event.source === 'RESEARCHER' ? 'text-blue-400' :
                                    event.source === 'WRITER' ? 'text-green-400' :
                                        'text-purple-400'
                        }>
                            [{event.source}]
                        </span>
                        <span className="text-gray-300">{event.type}</span>
                        <span className="text-gray-600 truncate flex-1">
                            {JSON.stringify(event.data)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
