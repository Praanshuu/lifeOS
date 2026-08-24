"use client";

import { useState, useRef, useEffect } from "react";
import {
    Brain, Send, BarChart2, Target, Loader2,
    ChevronDown, Lightbulb, AlertTriangle, Palette
} from "lucide-react";

type AgentMode = "chat" | "weekly-report" | "goal-planner";
type BgPattern = "dots" | "doodle" | "grid" | "none";
type Message = { role: "user" | "assistant"; content: string };
type ModelOption = { name: string; label: string; desc: string; source: "openrouter" | "ollama" | "groq" };
type ModelsResponse = { models: ModelOption[]; error?: string; hint?: string };

const MODE_INFO: Record<AgentMode, { label: string; icon: React.ReactNode; placeholder: string }> = {
    chat: {
        label: "Chat",
        icon: <Brain className="w-4 h-4" />,
        placeholder: 'Ask anything — "What should I focus on?" or "Audit my skipped tasks"',
    },
    "weekly-report": {
        label: "Weekly Report",
        icon: <BarChart2 className="w-4 h-4" />,
        placeholder: 'Click "Generate Report" to receive your weekly performance audit...',
    },
    "goal-planner": {
        label: "Goal Planner",
        icon: <Target className="w-4 h-4" />,
        placeholder: 'Describe your goal — "I want to launch a SaaS product by Q4"',
    },
};

const PATTERN_STYLES: Record<BgPattern, { name: string; style: React.CSSProperties; opacity: string }> = {
    dots: {
        name: "WhatsApp Dots",
        style: {
            backgroundImage: `radial-gradient(#ffffff 0.75px, transparent 0.75px), radial-gradient(#ffffff 0.75px, #09090b 0.75px)`,
            backgroundSize: `24px 24px`,
            backgroundPosition: `0 0, 12px 12px`
        },
        opacity: "opacity-[0.035]"
    },
    doodle: {
        name: "Subtle Doodle",
        style: {
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.12) 1.5px, transparent 1.5px), radial-gradient(circle at 0% 100%, rgba(255, 255, 255, 0.08) 1.5px, transparent 1.5px)`,
            backgroundSize: `36px 36px, 54px 54px`
        },
        opacity: "opacity-[0.04]"
    },
    grid: {
        name: "Minimal Grid",
        style: {
            backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
            backgroundSize: `20px 20px`
        },
        opacity: "opacity-[0.05]"
    },
    none: {
        name: "Pure Dark",
        style: {},
        opacity: "opacity-0"
    }
};

// ─── High Legibility Markdown Formatter ────────────────────────────────────

function FormattedContent({ content }: { content: string }) {
    const lines = content.split("\n");
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    return (
        <div className="space-y-2.5 font-sans text-[15px] leading-relaxed text-zinc-100 tracking-normal">
            {lines.map((line, idx) => {
                if (line.trim().startsWith("```")) {
                    if (inCodeBlock) {
                        inCodeBlock = false;
                        const codeText = codeBuffer.join("\n");
                        codeBuffer = [];
                        return (
                            <div key={idx} className="my-2.5 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 font-mono text-xs text-cyan-300 overflow-x-auto shadow-inner">
                                <pre>{codeText}</pre>
                            </div>
                        );
                    } else {
                        inCodeBlock = true;
                        return null;
                    }
                }

                if (inCodeBlock) {
                    codeBuffer.push(line);
                    return null;
                }

                if (line.startsWith("### ")) {
                    return (
                        <h4 key={idx} className="text-base font-bold text-white mt-3 mb-1">
                            {line.replace("### ", "")}
                        </h4>
                    );
                }
                if (line.startsWith("## ")) {
                    return (
                        <h3 key={idx} className="text-lg font-bold text-white mt-4 mb-1.5 border-b border-zinc-800/80 pb-1">
                            {line.replace("## ", "")}
                        </h3>
                    );
                }

                if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                    return (
                        <div key={idx} className="flex items-start gap-2 text-zinc-100 font-sans text-[15px] leading-relaxed my-0.5">
                            <span className="text-cyan-400 font-bold shrink-0 mt-0.5">•</span>
                            <span>{parseBoldText(line.trim().substring(2))}</span>
                        </div>
                    );
                }

                if (/^\d+\.\s/.test(line.trim())) {
                    return (
                        <div key={idx} className="flex items-start gap-2 text-zinc-100 font-sans text-[15px] leading-relaxed my-0.5">
                            <span className="font-mono text-xs text-indigo-400 font-bold shrink-0 mt-1">{line.trim().split(" ")[0]}</span>
                            <span>{parseBoldText(line.trim().replace(/^\d+\.\s/, ""))}</span>
                        </div>
                    );
                }

                if (!line.trim()) return <div key={idx} className="h-1" />;

                return <p key={idx} className="text-zinc-100">{parseBoldText(line)}</p>;
            })}
        </div>
    );
}

function parseBoldText(text: string) {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
}

function MessageBubble({ msg }: { msg: Message }) {
    const isUser = msg.role === "user";
    return (
        <div className={`flex gap-3 w-full ${isUser ? "justify-end" : "justify-start"} z-10`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <Brain className="w-4 h-4 text-cyan-400" />
                </div>
            )}
            <div
                className={`max-w-[85%] px-4 py-3 text-[15px] leading-relaxed ${
                    isUser
                        ? "bg-cyan-950/70 border border-cyan-500/25 text-cyan-50 rounded-2xl rounded-tr-xs shadow-md shadow-black/30"
                        : "bg-[#121316] border border-zinc-800 text-zinc-100 rounded-2xl rounded-tl-xs shadow-md shadow-black/30"
                }`}
            >
                {isUser ? <p className="whitespace-pre-wrap">{msg.content}</p> : <FormattedContent content={msg.content} />}
            </div>
        </div>
    );
}

export default function BodyguardClient({ 
    commitmentScore, 
    totalFocusHours, 
    pendingHighPriority 
}: {
    commitmentScore: number;
    totalFocusHours: number;
    pendingHighPriority: number;
    contextData?: any;
}) {
    const [mode, setMode] = useState<AgentMode>("chat");
    const [model, setModel] = useState("");
    const [bgPattern, setBgPattern] = useState<BgPattern>("dots");
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
                if (data.models && data.models.length > 0) setModel(data.models[0].name);
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

    const currentPattern = PATTERN_STYLES[bgPattern];

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-11rem)] w-full">
            
            {/* LEFT: Chat Section */}
            <div className="flex-1 flex flex-col bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden shadow-sm relative">
                
                {/* Mode Selector & Model Picker Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 h-14 border-b border-zinc-900 bg-zinc-950/80 z-20">
                    
                    {/* Mode Tabs */}
                    <div className="flex items-center gap-4">
                        {(["chat", "weekly-report", "goal-planner"] as AgentMode[]).map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setMessages([]); }}
                                className={`flex items-center gap-2 h-full text-xs font-medium transition-colors relative py-4 ${
                                    mode === m
                                        ? "text-zinc-100"
                                        : "text-zinc-500 hover:text-zinc-300"
                                }`}
                            >
                                {MODE_INFO[m].icon}
                                {MODE_INFO[m].label}
                                {mode === m && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Background Pattern Switcher & Model Picker */}
                    <div className="flex items-center gap-3">
                        
                        {/* Wallpaper Theme Picker */}
                        <div className="relative flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-400">
                            <Palette className="w-3.5 h-3.5 text-zinc-500" />
                            <select
                                value={bgPattern}
                                onChange={e => setBgPattern(e.target.value as BgPattern)}
                                className="bg-transparent text-zinc-300 text-xs cursor-pointer focus:outline-none pr-1"
                            >
                                <option value="dots">WhatsApp Dots</option>
                                <option value="doodle">Subtle Doodle</option>
                                <option value="grid">Minimal Grid</option>
                                <option value="none">Pure Dark</option>
                            </select>
                        </div>

                        {/* Model Picker */}
                        <div className="relative">
                            {modelsLoading ? (
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Loading models...</span>
                                </div>
                            ) : modelsData?.models.length === 0 ? (
                                <div className="flex items-center gap-1.5 text-xs text-rose-400">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>No model available</span>
                                </div>
                            ) : (
                                <div className="relative">
                                    <select
                                        value={model}
                                        onChange={e => setModel(e.target.value)}
                                        className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:border-zinc-700"
                                    >
                                        {modelsData?.models.map(o => (
                                            <option key={o.name} value={o.name}>{o.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Messages View with Dynamic Wallpaper Pattern Background */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 relative">
                    
                    {/* Background Pattern Layer */}
                    <div 
                        className={`absolute inset-0 ${currentPattern.opacity} pointer-events-none z-0 bg-repeat transition-all duration-300`}
                        style={currentPattern.style}
                    />

                    {messages.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center max-w-sm mx-auto my-auto z-10">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-zinc-500" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-zinc-200 font-semibold text-sm">Agent Ready</h4>
                                <p className="text-zinc-500 text-xs leading-relaxed">
                                    {mode === "weekly-report"
                                        ? "Generate a comprehensive analysis of your performance and task completion."
                                        : mode === "goal-planner"
                                        ? "Describe a goal and the agent will create a structured execution plan."
                                        : "Ask anything about your tasks, goals, or focus patterns."}
                                </p>
                            </div>
                            {mode === "weekly-report" && (
                                <button
                                    onClick={() => sendMessage("Generate my weekly report.")}
                                    disabled={loading}
                                    className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                    Generate Report
                                </button>
                            )}
                        </div>
                    )}

                    {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

                    {loading && (
                        <div className="flex gap-3 items-center z-10">
                            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                            </div>
                            <span className="text-xs text-zinc-400 font-mono">Thinking...</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs z-10">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input Dock */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-950 z-20">
                    <div className="flex gap-3">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={MODE_INFO[mode].placeholder}
                            rows={1}
                            disabled={loading}
                            className="flex-1 bg-zinc-900/60 border border-zinc-800 text-zinc-100 text-[15px] leading-relaxed rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-zinc-700 transition-colors placeholder:text-zinc-600 disabled:opacity-50 min-h-[46px] max-h-[120px]"
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={loading || (!input.trim() && mode !== "weekly-report")}
                            className="px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-xl transition-colors flex items-center justify-center border border-zinc-700 shrink-0"
                        >
                            <Send className="w-4 h-4 text-zinc-300" />
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT: System State Sidebar */}
            <div className="w-full lg:w-72 flex flex-col gap-4">
                
                {/* State Metrics */}
                <div className="bg-zinc-950 rounded-xl border border-zinc-900 p-5 space-y-5">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">System State</h3>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-xs text-zinc-400 font-medium">Commitment Score</span>
                                <span className={`text-sm font-bold font-mono ${commitmentScore >= 70 ? "text-emerald-400" : commitmentScore >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                                    {commitmentScore}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${commitmentScore >= 70 ? "bg-emerald-500" : commitmentScore >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                                    style={{ width: `${commitmentScore}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Focus (14d)</span>
                                <span className="text-zinc-100 font-bold font-mono text-base">{totalFocusHours}h</span>
                            </div>
                            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">High-Pri</span>
                                <span className={`font-bold font-mono text-base ${pendingHighPriority > 3 ? "text-rose-400" : "text-zinc-100"}`}>
                                    {pendingHighPriority}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Commands */}
                <div className="bg-zinc-950 rounded-xl border border-zinc-900 p-5 flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="w-3.5 h-3.5 text-zinc-500" />
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Quick Commands</h3>
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
                                className="text-left text-xs font-medium text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors"
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
