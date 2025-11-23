import { useState, useEffect, useCallback } from 'react';
import { AgentEvent } from '@/lib/types';
import { SAMPLE_EVENTS } from '@/lib/sampleEvents';

const WS_URLS = {
    WRITER: 'ws://localhost:8002/events',
    RESEARCHER: 'ws://localhost:8001/events',
    MCP: 'ws://localhost:9000/events',
};

// Check if we're in demo mode (deployed without backend)
const IS_DEMO_MODE = typeof window !== 'undefined' &&
    (window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('netlify.app') ||
        process.env.NEXT_PUBLIC_DEMO_MODE === 'true');

export function useEventStream() {
    const [events, setEvents] = useState<AgentEvent[]>([]);
    const [isConnected, setIsConnected] = useState({
        WRITER: IS_DEMO_MODE,
        RESEARCHER: IS_DEMO_MODE,
        MCP: IS_DEMO_MODE,
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

    // Demo mode: Simulate events
    useEffect(() => {
        if (IS_DEMO_MODE) {
            console.log('[Demo Mode] Using sample events');
            // Don't auto-play, wait for user to click "Start Demo"
            return;
        }

        // Production mode: WebSocket connections
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

    const playDemoEvents = useCallback(() => {
        if (!IS_DEMO_MODE) return;

        console.log('[Demo Mode] Playing sample events...');
        setEvents([]);

        SAMPLE_EVENTS.forEach((event, index) => {
            setTimeout(() => {
                addEvent(event);
            }, index * 3000); // 3 seconds between each event
        });
    }, [addEvent]);

    return { events, isConnected, clearEvents, lastEvent, playDemoEvents, isDemoMode: IS_DEMO_MODE };
}
