import React, { useState } from 'react';
import { X, Play, Loader2 } from 'lucide-react';

interface StartDemoModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDemoMode?: boolean;
    onStartDemo?: () => void;
}

export function StartDemoModal({ isOpen, onClose, isDemoMode, onStartDemo }: StartDemoModalProps) {
    const [topic, setTopic] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Demo mode: Just play sample events
        if (isDemoMode) {
            onStartDemo?.();
            onClose();
            return;
        }

        // Production mode: Call backend API
        if (!topic.trim()) return;

        setIsLoading(true);
        try {
            await fetch('/api/demo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, apiKey }),
            });
            onClose();
            setTopic('');
        } catch (error) {
            console.error('Failed to start demo:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {isDemoMode ? 'Run Demo Visualization' : 'Start Research Demo'}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {isDemoMode
                                ? 'Watch a pre-recorded demo of the agent workflow'
                                : 'Enter a topic to research using the agent network'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {!isDemoMode && (
                        <>
                            <div>
                                <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-2">
                                    Research Topic
                                </label>
                                <input
                                    id="topic"
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., Vector databases, Quantum computing..."
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300 mb-2">
                                    OpenAI API Key (Optional)
                                </label>
                                <input
                                    id="apiKey"
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Leave empty to use server's API key
                                </p>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || (!isDemoMode && !topic.trim())}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 disabled:shadow-none active:scale-95 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Starting...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                {isDemoMode ? 'Play Demo' : 'Start Research'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
