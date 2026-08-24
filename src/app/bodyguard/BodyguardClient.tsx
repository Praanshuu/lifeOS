"use client";

import { useState, useRef, useEffect } from "react";
import {
    Brain, Send, BarChart2, Target, Loader2,
    ChevronDown, Lightbulb, AlertTriangle, Palette,
    Shield, Sparkles, RotateCcw, CheckCircle2, Zap
} from "lucide-react";

type AgentMode = "chat" | "weekly-report" | "goal-planner";
type BgPattern = "dots" | "doodle" | "grid" | "none";
type Message = { role: "user" | "assistant"; content: string; timestamp?: string };
type ModelOption = { name: string; label: string; desc: string; source: "openrouter" | "ollama" | "groq" };
type ModelsResponse = { models: ModelOption[]; error?: string; hint?: string };

const MODE_INFO: Record<AgentMode, { label: string; icon: React.ReactNode; placeholder: string; badge: string }> = {
    chat: {
        label: "AI Mentor",
        icon: <Brain className="w-4 h-4" />,
        placeholder: 'Ask anything — e.g. "What is my highest leverage task today?" or "Audit my bottlenecks"',
        badge: "Strategic Coaching",
    },
    "weekly-report": {
        label: "Weekly Reality Check",
        icon: <BarChart2 className="w-4 h-4" />,
        placeholder: 'Click "Run Performance Audit" to evaluate your last 14 days of focus vs distraction...',
        badge: "Truth-Teller Audit",
    },
    "goal-planner": {
        label: "Goal Strategist",
        icon: <Target className="w-4 h-4" />,
        placeholder: 'Describe a goal — e.g. "Launch my SaaS v2 MVP by next Friday with 2h/day"',
        badge: "Goal Decomposition",
    },
};

const PATTERN_STYLES: Record<BgPattern, { name: string; style: React.CSSProperties; opacity: string }> = {
    dots: {
        name: "Subtle Matrix",
        style: {
            backgroundImage: `radial-gradient(#38bdf8 0.75px, transparent 0.75px), radial-gradient(#6366f1 0.75px, #09090b 0.75px)`,
            backgroundSize: `24px 24px`,
            backgroundPosition: `0 0, 12px 12px`
        },
        opacity: "opacity-[0.04]"
    },
    doodle: {
        name: "Radial Glow",
        style: {
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.15) 1.5px, transparent 1.5px), radial-gradient(circle at 0% 100%, rgba(99, 102, 241, 0.1) 1.5px, transparent 1.5px)`,
            backgroundSize: `36px 36px, 54px 54px`
        },
        opacity: "opacity-[0.045]"
    },
    grid: {
        name: "Tech Grid",
        style: {
            backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
            backgroundSize: `20px 20px`
        },
        opacity: "opacity-[0.05]"
    },
    none: {
        name: "Pure Obsidian",
        style: {},
        opacity: "opacity-0"
    }
};

// ──────────────────────────────────────────────────────────────
// High-Legibility Markdown Formatter
// ──────────────────────────────────────────────────────────────

function FormattedContent({ content }: { content: string }) {
    const lines = content.split("\n");
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    return (
        <div className="space-y-3 font-sans text-[14.5px] leading-relaxed text-zinc-100 tracking-normal">
            {lines.map((line, idx) => {
                if (line.trim().startsWith("```")) {
                    if (inCodeBlock) {
                        inCodeBlock = false;
                        const codeText = codeBuffer.join("\n");
                        codeBuffer = [];
                        return (
                            <div key={idx} className="my-3 rounded-xl border border-cyan-500/20 bg-zinc-950/90 p-4 font-mono text-xs text-cyan-300 overflow-x-auto shadow-inner">
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
                        <div key={idx} className="flex items-center gap-2 pt-2.5 pb-1 border-b border-zinc-800/60 mt-3">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <h4 className="text-[15px] font-bold text-white tracking-tight">
                                {line.replace("### ", "")}
                            </h4>
                        </div>
                    );
                }

                if (line.startsWith("## ")) {
                    return (
                        <div key={idx} className="flex items-center gap-2.5 pt-3.5 pb-1.5 border-b border-zinc-800 mt-4">
                            <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                            <h3 className="text-base font-bold text-white tracking-tight">
                                {line.replace("## ", "")}
                            </h3>
                        </div>
                    );
                }

                if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                    return (
                        <div key={idx} className="flex items-start gap-2.5 text-zinc-200 my-1">
                            <span className="text-cyan-400 font-bold shrink-0 mt-0.5 text-sm">•</span>
                            <span className="leading-relaxed">{parseBoldText(line.trim().substring(2))}</span>
                        </div>
                    );
                }

                if (/^\d+\.\s/.test(line.trim())) {
                    return (
                        <div key={idx} className="flex items-start gap-2.5 text-zinc-200 my-1">
                            <span className="font-mono text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-bold">
                                {line.trim().split(" ")[0]}
                            </span>
                            <span className="leading-relaxed">{parseBoldText(line.trim().replace(/^\d+\.\s/, ""))}</span>
                        </div>
                    );
                }

                if (!line.trim()) return <div key={idx} className="h-1" />;

                return <p key={idx} className="text-zinc-200">{parseBoldText(line)}</p>;
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
        <div className={`flex gap-3.5 w-full ${isUser ? "justify-end" : "justify-start"} z-10 animate-in fade-in-50 duration-200`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-cyan-950/40">
                    <Brain className="w-4 h-4 text-cyan-300" />
                </div>
            )}
            <div
                className={`max-w-[86%] px-5 py-3.5 text-[14.5px] leading-relaxed rounded-2xl ${
                    isUser
                        ? "bg-gradient-to-r from-cyan-600/90 to-cyan-500/90 text-white rounded-tr-xs shadow-lg shadow-cyan-950/30 border border-cyan-400/30"
                        : "bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-zinc-100 rounded-tl-xs shadow-xl shadow-black/40"
                }`}
            >
                {isUser ? (
                    <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                ) : (
                    <FormattedContent content={msg.content} />
                )}
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
    const [mounted, setMounted] = useState(false);
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

    useEffect(() => {
        setMounted(true);
        fetch("/api/ai/models")
            .then(r => r.json())
            .then((data: ModelsResponse) => {
                setModelsData(data);
                if (data.models && data.models.length > 0) {
                    setModel(data.models[0].name);
                }
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
            { role: "user", content: userMessage || "Generate my performance reality check report." },
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
                    model: model || undefined,
                    message: userMessage || "Generate my performance reality check report.",
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
            setError(e instanceof Error ? e.message : "Network connection error");
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

    const clearConversation = () => {
        setMessages([]);
        setError(null);
    };

    const currentPattern = PATTERN_STYLES[bgPattern];

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-11rem)] w-full bg-zinc-950 rounded-2xl border border-zinc-900">
                <div className="flex items-center gap-3 text-sm text-zinc-500 font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Initializing LifeOS AI Bodyguard...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-11rem)] w-full">
            
            {/* LEFT: Chat Window */}
            <div className="flex-1 flex flex-col bg-zinc-950/80 backdrop-blur-xl rounded-2xl border border-zinc-800/70 overflow-hidden shadow-2xl relative">
                
                {/* Header: Mode Selector & Active Model Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-zinc-800/80 bg-zinc-950/90 z-20">
                    
                    {/* Mode Tabs */}
                    <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-1">
                        {(["chat", "weekly-report", "goal-planner"] as AgentMode[]).map(m => {
                            const isActive = mode === m;
                            return (
                                <button
                                    key={m}
                                    onClick={() => { setMode(m); setMessages([]); setError(null); }}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                        isActive
                                            ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-sm shadow-cyan-950/50"
                                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                                    }`}
                                >
                                    {MODE_INFO[m].icon}
                                    <span>{MODE_INFO[m].label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Controls: Theme & Model */}
                    <div className="flex items-center gap-2.5">
                        
                        {/* Clear Chat Button */}
                        {messages.length > 0 && (
                            <button
                                onClick={clearConversation}
                                title="Reset Conversation"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-medium transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset</span>
                            </button>
                        )}

                        {/* Wallpaper Theme Picker */}
                        <div className="relative flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400">
                            <Palette className="w-3.5 h-3.5 text-zinc-400" />
                            <select
                                value={bgPattern}
                                onChange={e => setBgPattern(e.target.value as BgPattern)}
                                className="bg-transparent text-zinc-300 text-xs cursor-pointer focus:outline-none pr-1"
                            >
                                <option value="dots" className="bg-zinc-950 text-zinc-200">Subtle Matrix</option>
                                <option value="doodle" className="bg-zinc-950 text-zinc-200">Radial Glow</option>
                                <option value="grid" className="bg-zinc-950 text-zinc-200">Tech Grid</option>
                                <option value="none" className="bg-zinc-950 text-zinc-200">Pure Obsidian</option>
                            </select>
                        </div>

                        {/* Model Indicator & Picker */}
                        <div className="relative">
                            {modelsLoading ? (
                                <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                                    <span>Nemotron...</span>
                                </div>
                            ) : modelsData?.models.length === 0 ? (
                                <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>No Model</span>
                                </div>
                            ) : (
                                <div className="relative flex items-center">
                                    <select
                                        value={model}
                                        onChange={e => setModel(e.target.value)}
                                        className="appearance-none bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs font-medium rounded-lg px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:border-cyan-400 shadow-sm"
                                    >
                                        {modelsData?.models.map(o => (
                                            <option key={o.name} value={o.name} className="bg-zinc-950 text-zinc-200 font-sans">
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cyan-400 pointer-events-none" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Messages View */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 relative">
                    
                    {/* Pattern Layer */}
                    <div 
                        className={`absolute inset-0 ${currentPattern.opacity} pointer-events-none z-0 bg-repeat transition-all duration-300`}
                        style={currentPattern.style}
                    />

                    {messages.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto my-auto z-10 animate-in fade-in duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-950/30">
                                <Shield className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-zinc-100 font-bold text-base tracking-tight">
                                    {mode === "weekly-report"
                                        ? "Performance Reality Check"
                                        : mode === "goal-planner"
                                        ? "Strategic Goal Decomposition"
                                        : "LifeOS AI Bodyguard Ready"}
                                </h3>
                                <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
                                    {mode === "weekly-report"
                                        ? "Audits your last 14 days of focus, highlights stagnant goals, and reveals hidden friction patterns."
                                        : mode === "goal-planner"
                                        ? "Breaks monolithic ambitions into realistic daily focus blocks that match your actual capacity."
                                        : "Ask anything about your goals, pending tasks, focus capacity, or execution strategy."}
                                </p>
                            </div>

                            {mode === "weekly-report" ? (
                                <button
                                    onClick={() => sendMessage("Generate my performance reality check report.")}
                                    disabled={loading}
                                    className="mt-3 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-cyan-950/40 flex items-center gap-2"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Run Performance Audit</span>
                                </button>
                            ) : (
                                <div className="flex flex-wrap gap-2 justify-center mt-3">
                                    {[
                                        "What should I focus on right now?",
                                        "Which goals are currently stagnant?",
                                        "Analyze my recent distractions",
                                    ].map(sample => (
                                        <button
                                            key={sample}
                                            onClick={() => sendMessage(sample)}
                                            className="px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/30 text-zinc-300 hover:text-cyan-300 text-xs transition-colors"
                                        >
                                            {sample}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

                    {loading && (
                        <div className="flex gap-3 items-center z-10 bg-zinc-900/70 border border-zinc-800/80 rounded-xl px-4 py-2.5 max-w-xs shadow-md">
                            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                            </div>
                            <span className="text-xs text-cyan-300 font-mono font-medium">Nemotron 3 Super reasoning...</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs z-10 shadow-md">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                            <span className="leading-relaxed">{error}</span>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input Dock */}
                <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/90 z-20">
                    <div className="flex gap-3 items-center">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={MODE_INFO[mode].placeholder}
                            rows={1}
                            disabled={loading}
                            className="flex-1 bg-zinc-900/80 border border-zinc-800 focus:border-cyan-500/50 text-zinc-100 text-[14.5px] leading-relaxed rounded-xl px-4 py-3 resize-none focus:outline-none transition-colors placeholder:text-zinc-600 disabled:opacity-50 min-h-[48px] max-h-[120px] shadow-inner"
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={loading || (!input.trim() && mode !== "weekly-report")}
                            className="px-4 h-[48px] bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center shadow-md shadow-cyan-950/30 shrink-0 border border-cyan-400/20"
                        >
                            <Send className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT: System State Sidebar */}
            <div className="w-full lg:w-72 flex flex-col gap-4">
                
                {/* State Metrics */}
                <div className="bg-zinc-950/80 backdrop-blur-xl rounded-2xl border border-zinc-800/70 p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">System State</h3>
                        <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                        </span>
                    </div>
                    
                    <div className="space-y-3.5">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-baseline">
                                <span className="text-xs text-zinc-400">Commitment Score</span>
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

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/70">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Focus (14d)</span>
                                <span className="text-zinc-100 font-bold font-mono text-base">{totalFocusHours}h</span>
                            </div>
                            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/70">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">High-Pri</span>
                                <span className={`font-bold font-mono text-base ${pendingHighPriority > 3 ? "text-rose-400" : "text-zinc-100"}`}>
                                    {pendingHighPriority}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Commands */}
                <div className="bg-zinc-950/80 backdrop-blur-xl rounded-2xl border border-zinc-800/70 p-5 flex-1 flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Quick Commands</h3>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        {[
                            { label: "What should I focus on?", mode: "chat" as AgentMode },
                            { label: "Audit my performance", mode: "weekly-report" as AgentMode },
                            { label: "Break down a big goal", mode: "goal-planner" as AgentMode },
                        ].map(cmd => (
                            <button
                                key={cmd.label}
                                onClick={() => {
                                    setMode(cmd.mode);
                                    setMessages([]);
                                    if (cmd.mode !== "weekly-report") {
                                        setInput(cmd.label);
                                    } else {
                                        setTimeout(() => sendMessage("Generate my performance reality check report."), 100);
                                    }
                                }}
                                className="text-left text-xs font-medium text-zinc-300 hover:text-cyan-300 px-3.5 py-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/60 hover:border-cyan-500/30 transition-all flex items-center justify-between group"
                            >
                                <span>{cmd.label}</span>
                                <Zap className="w-3 h-3 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
