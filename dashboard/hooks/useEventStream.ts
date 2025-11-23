import { useState, useEffect, useCallback } from 'react';
import { AgentEvent } from '@/lib/types';

const WS_URLS = {
    WRITER: 'ws://localhost:8002/events',
    RESEARCHER: 'ws://localhost:8001/events',
    MCP: 'ws://localhost:9000/events',
};

export function useEventStream() {
    const [events, setEvents] = useState<AgentEvent[]>([]);
    const [isConnected, setIsConnected] = useState({
        WRITER: false,
        RESEARCHER: false,
        MCP: false,
    });

    const [lastEvent, setLastEvent] = useState<AgentEvent | null>(null);

    const addEvent = useCallback((event: AgentEvent) => {
        setLastEvent(event);
        setEvents((prev) => {
            // Avoid duplicates if possible (by ID)
            if (prev.some(e => e.id === event.id)) return prev;
            return [...prev, event].sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
        });
    }, []);

    useEffect(() => {
        const connections: WebSocket[] = [];

        Object.entries(WS_URLS).forEach(([key, url]) => {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log(`Connected to ${key}`);
                setIsConnected(prev => ({ ...prev, [key]: true }));
            };

            ws.onclose = () => {
                console.log(`Disconnected from ${key}`);
                setIsConnected(prev => ({ ...prev, [key]: false }));
            };

            ws.onmessage = (message) => {
                try {
                    const event = JSON.parse(message.data);
                    addEvent(event);
                } catch (e) {
                    console.error('Failed to parse event', e);
                }
            };

            connections.push(ws);
        });

        return () => {
            connections.forEach(ws => ws.close());
        };
    }, [addEvent]);

    const clearEvents = useCallback(() => setEvents([]), []);

    return { events, isConnected, clearEvents, lastEvent };
}
