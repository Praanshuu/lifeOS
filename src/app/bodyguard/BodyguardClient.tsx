"use client";

import { useState, useRef, useEffect } from "react";
import {
    Brain, Send, Zap, Target, BarChart2, Loader2,
    ChevronDown, Lightbulb, AlertTriangle, Cloud, Server
} from "lucide-react";

type AgentMode = "chat" | "weekly-report" | "goal-planner";
type Message = { role: "user" | "assistant"; content: string };
type ModelOption = { name: string; label: string; desc: string; source: "ollama" | "groq" };
type ModelsResponse = { models: ModelOption[]; error?: string; hint?: string };

const MODE_INFO: Record<AgentMode, { label: string; icon: React.ReactNode; placeholder: string }> = {
    chat: {
        label: "Chat",
        icon: <Brain className="w-4 h-4" />,
        placeholder: 'Ask anything — "What should I focus on?" or "Delete the task about X"',
    },
    "weekly-report": {
        label: "Weekly Report",
        icon: <BarChart2 className="w-4 h-4" />,
        placeholder: 'Click "Generate Report" to get your Radical Truth briefing...',
    },
    "goal-planner": {
        label: "Goal Planner",
        icon: <Target className="w-4 h-4" />,
        placeholder: 'Describe your ambition — "I want to launch a SaaS by December 2026"',
    },
};

function MessageBubble({ msg }: { msg: Message }) {
    const isUser = msg.role === "user";
    return (
        <div className={`flex gap-4 w-full animate-in fade-in duration-300 ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 mt-1">
                    <Brain className="w-4 h-4 text-cyan-500" />
                </div>
            )}
            <div
                className={`max-w-[85%] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap ${
                    isUser
                        ? "bg-zinc-800 text-zinc-100 rounded-xl rounded-tr-none border border-zinc-700/50"
                        : "bg-zinc-900/50 border border-zinc-800/80 text-zinc-300 rounded-xl rounded-tl-none"
                }`}
            >
                {msg.content}
            </div>
        </div>
    );
}

export default function BodyguardClient({ commitmentScore, totalFocusHours, pendingHighPriority }: {
    commitmentScore: number;
    totalFocusHours: number;
    pendingHighPriority: number;
}) {
    const [mode, setMode] = useState<AgentMode>("chat");
    const [model, setModel] = useState("");
    const [modelsData, setModelsData] = useState<ModelsResponse | null>(null);
    const [modelsLoading, setModelsLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Load available models on mount
    useEffect(() => {
        fetch("/api/ai/models")
            .then(r => r.json())
            .then((data: ModelsResponse) => {
                setModelsData(data);
                if (data.models.length > 0) setModel(data.models[0].name);
            })
            .catch(() => setModelsData({ models: [], error: "Failed to reach model API" }))
            .finally(() => setModelsLoading(false));
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const sendMessage = async (overrideMessage?: string) => {
        const userMessage = overrideMessage ?? input.trim();
        if (!userMessage && mode !== "weekly-report") return;

        const newMessages: Message[] = [
            ...messages,
            { role: "user", content: userMessage || "Generate my weekly report." },
        ];
        setMessages(newMessages);
        setInput("");
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/ai/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode,
                    model,
                    message: userMessage || "Generate my weekly report.",
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                }),
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                setError(data.error || "Agent failed to respond.");
                return;
            }

            setMessages([...newMessages, { role: "assistant", content: data.response }]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex gap-10 h-[calc(100vh-12rem)]">
            {/* LEFT: Chat */}
            <div className="flex-1 flex flex-col bg-zinc-950/20 rounded-xl border border-zinc-900 overflow-hidden">
                {/* Header / Tabs */}
                <div className="flex items-center gap-6 px-6 h-14 border-b border-zinc-900 bg-zinc-950/40">
                    {(["chat", "weekly-report", "goal-planner"] as AgentMode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setMessages([]); }}
                            className={`flex items-center gap-2 h-full text-[13px] font-medium transition-all relative ${
                                mode === m
                                    ? "text-cyan-400"
                                    : "text-zinc-500 hover:text-zinc-300"
                            }`}
                        >
                            {MODE_INFO[m].icon}
                            {MODE_INFO[m].label}
                            {mode === m && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                            )}
                        </button>
                    ))}
                </div>
                    {/* Model selector */}
                    <div className="flex items-center gap-2">
                        {modelsData && modelsData.models.length > 0 && (() => {
                            const hasOllama = modelsData.models.some(m => m.source === "ollama");
                            const hasGroq = modelsData.models.some(m => m.source === "groq");
                            return (
                                <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                                    {hasOllama && <><Server className="w-3 h-3" /> Local</>}
                                    {hasOllama && hasGroq && <span>·</span>}
                                    {hasGroq && <><Cloud className="w-3 h-3" /> Groq</>}
                                </span>
                            );
                        })()}
                        <div className="relative">
                            {modelsLoading ? (
                                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
                                    <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                                    <span className="text-zinc-500 text-xs">Loading models...</span>
                                </div>
                            ) : modelsData?.models.length === 0 ? (
                                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                    <span className="text-red-400 text-xs">{modelsData?.error || modelsData?.hint || "No models"}</span>
                                </div>
                            ) : (
                                <>
                                    <select
                                        value={model}
                                        onChange={e => setModel(e.target.value)}
                                        className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-lg px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:border-zinc-700"
                                    >
                                        {modelsData?.models.map(o => (
                                            <option key={o.name} value={o.name}>{o.label} — {o.desc}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                                </>
                            )}
                        </div>
                    </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 scroll-smooth">
                    {messages.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center animate-in fade-in duration-500">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
                                <Brain className="w-6 h-6 text-cyan-500/50" />
                            </div>
                            <div className="max-w-sm space-y-2">
                                <h4 className="text-zinc-200 font-semibold text-sm">Agent Ready</h4>
                                <p className="text-zinc-500 text-xs leading-relaxed">
                                    {mode === "weekly-report"
                                        ? "Generate a comprehensive analysis of your last 14 days. Performance, leaks, and wins."
                                        : mode === "goal-planner"
                                        ? "Describe a goal. I will create an execution strategy with time-boxed tasks."
                                        : "Ask anything about your data. I can read logs, check goals, and manage your focus sessions."}
                                </p>
                            </div>
                            {mode === "weekly-report" && (
                                <button
                                    onClick={() => sendMessage("Generate my weekly report.")}
                                    disabled={loading}
                                    className="mt-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-[13px] font-bold rounded-lg transition-all shadow-lg active:scale-95"
                                >
                                    Generate Report
                                </button>
                            )}
                        </div>
                    )}
                    {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {error.includes("11434") || error.includes("ECONNREFUSED")
                                ? "Cannot reach Ollama. Make sure it's running: ollama serve"
                                : error}
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-6 py-6 border-t border-zinc-900 bg-zinc-950/20">
                    <div className="flex gap-4">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={MODE_INFO[mode].placeholder}
                            rows={1}
                            disabled={loading}
                            className="flex-1 bg-zinc-900/50 border border-zinc-800 text-zinc-100 text-[14px] rounded-xl px-4 py-3.5 resize-none focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-600 disabled:opacity-50"
                            style={{ minHeight: "52px", maxHeight: "150px" }}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={loading || (!input.trim() && mode !== "weekly-report")}
                            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center border border-zinc-700 active:scale-95"
                        >
                            <Send className="w-4 h-4 text-zinc-400" />
                        </button>
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Enter to send</span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Shift+Enter for new line</span>
                    </div>
                </div>
            </div>

            {/* RIGHT: System State Panel */}
            <div className="w-80 flex flex-col gap-6">
                <div className="bg-zinc-950/20 rounded-xl border border-zinc-900 p-6 space-y-6">
                    <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">System State</h3>
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-zinc-500 text-xs font-medium">Commitment Score</span>
                                <span className={`text-[15px] font-bold tracking-tight ${commitmentScore >= 70 ? "text-green-500" : commitmentScore >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                                    {commitmentScore}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${commitmentScore >= 70 ? "bg-green-500" : commitmentScore >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                                    style={{ width: `${commitmentScore}%` }}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Focus (14d)</span>
                                <span className="text-zinc-100 text-lg font-bold">{totalFocusHours}h</span>
                            </div>
                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">High-Pri</span>
                                <span className={`text-lg font-bold ${pendingHighPriority > 3 ? "text-red-500" : "text-zinc-100"}`}>
                                    {pendingHighPriority}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-950/20 rounded-xl border border-zinc-900 p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <Lightbulb className="w-3.5 h-3.5 text-zinc-500" />
                        <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Quick Commands</h3>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {[
                            { label: "What should I focus on?", mode: "chat" as AgentMode },
                            { label: "Analyze my week", mode: "weekly-report" as AgentMode },
                            { label: "Plan a new goal", mode: "goal-planner" as AgentMode },
                        ].map(cmd => (
                            <button
                                key={cmd.label}
                                onClick={() => {
                                    setMode(cmd.mode);
                                    setMessages([]);
                                    if (cmd.mode !== "weekly-report") setInput(cmd.label);
                                    else setTimeout(() => sendMessage("Generate my weekly report."), 100);
                                }}
                                className="text-left text-xs font-medium text-zinc-500 hover:text-zinc-200 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-all"
                            >
                                {cmd.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
