"use client";

import { useState, useRef, useEffect } from "react";
import {
    Brain, Send, BarChart2, Target, Loader2,
    ChevronDown, AlertTriangle, Palette,
    Shield, Sparkles, RotateCcw
} from "lucide-react";
import { VisualBlock } from "@/components/ai/VisualBlock";

type AgentMode = "chat" | "weekly-report" | "goal-planner";
type BgPattern = "dots" | "doodle" | "grid" | "none";
type Message = { role: "user" | "assistant"; content: string; timestamp?: string };
type ModelOption = { name: string; label: string; desc: string; source: "openrouter" | "ollama" | "groq" };
type ModelsResponse = { models: ModelOption[]; error?: string; hint?: string };

const MODE_INFO: Record<AgentMode, { label: string; icon: React.ReactNode; placeholder: string; badge: string }> = {
    chat: {
        label: "AI Mentor",
        icon: <Brain className="w-4 h-4" />,
        placeholder: 'Ask anything — e.g. "What is my highest leverage task today?" or "Audit my bottlenecks" (Shift+Enter for new line)',
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
// High-Legibility Markdown, Table & Visual Block Formatter
// ──────────────────────────────────────────────────────────────

function FormattedContent({ content }: { content: string }) {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // 1. Handle ```viz blocks
        if (line.trim().startsWith("```viz")) {
            i++;
            const vizLines: string[] = [];
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                vizLines.push(lines[i]);
                i++;
            }
            if (i < lines.length) i++; // skip closing ```
            const rawJson = vizLines.join("\n").trim();
            elements.push(<VisualBlock key={`viz-${i}`} rawJson={rawJson} />);
            continue;
        }

        // 2. Handle generic ``` code blocks
        if (line.trim().startsWith("```")) {
            i++;
            const codeLines: string[] = [];
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            if (i < lines.length) i++; // skip closing ```
            const codeText = codeLines.join("\n");
            elements.push(
                <div key={`code-${i}`} className="my-3 rounded-xl border border-cyan-500/20 bg-zinc-950/90 p-4 font-mono text-xs text-cyan-300 overflow-x-auto shadow-inner">
                    <pre>{codeText}</pre>
                </div>
            );
            continue;
        }

        // 3. Handle Markdown Tables (| col1 | col2 |)
        if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
                tableLines.push(lines[i].trim());
                i++;
            }

            if (tableLines.length >= 2) {
                const parseRow = (r: string) =>
                    r
                        .slice(1, -1)
                        .split("|")
                        .map(cell => cell.trim());

                const headerCells = parseRow(tableLines[0]);
                const bodyRows = tableLines
                    .slice(1)
                    .filter(r => !/^\|(\s*:?-+:?\s*\|)+$/.test(r))
                    .map(parseRow);

                elements.push(
                    <div key={`table-${i}`} className="my-3.5 overflow-x-auto rounded-xl border border-zinc-800/90 bg-zinc-950/80 shadow-md">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
                                <tr>
                                    {headerCells.map((cell, idx) => (
                                        <th key={idx} className="px-3.5 py-2.5 font-bold">
                                            {parseBoldText(cell)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {bodyRows.map((row, rowIdx) => (
                                    <tr key={rowIdx} className="hover:bg-zinc-900/30 transition-colors">
                                        {row.map((cell, cellIdx) => (
                                            <td key={cellIdx} className="px-3.5 py-2.5 text-zinc-200 leading-relaxed">
                                                {parseBoldText(cell)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
                continue;
            }
        }

        // 4. Handle Horizontal Rules (--- or ***)
        if (line.trim() === "---" || line.trim() === "***") {
            elements.push(<hr key={`hr-${i}`} className="my-3.5 border-t border-zinc-800/80" />);
            i++;
            continue;
        }

        // 5. Handle Headings
        if (line.startsWith("### ")) {
            elements.push(
                <div key={`h3-${i}`} className="flex items-center gap-2 pt-2.5 pb-1 border-b border-zinc-800/60 mt-3">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <h4 className="text-[15px] font-bold text-white tracking-tight">
                        {line.replace("### ", "")}
                    </h4>
                </div>
            );
            i++;
            continue;
        }

        if (line.startsWith("## ")) {
            elements.push(
                <div key={`h2-${i}`} className="flex items-center gap-2.5 pt-3.5 pb-1.5 border-b border-zinc-800 mt-4">
                    <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                    <h3 className="text-base font-bold text-white tracking-tight">
                        {line.replace("## ", "")}
                    </h3>
                </div>
            );
            i++;
            continue;
        }

        // 6. Handle Bullet Lists
        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
            elements.push(
                <div key={`li-${i}`} className="flex items-start gap-2.5 text-zinc-200 my-1">
                    <span className="text-cyan-400 font-bold shrink-0 mt-0.5 text-sm">•</span>
                    <span className="leading-relaxed">{parseBoldText(line.trim().substring(2))}</span>
                </div>
            );
            i++;
            continue;
        }

        // 7. Handle Numbered Lists
        if (/^\d+\.\s/.test(line.trim())) {
            elements.push(
                <div key={`num-${i}`} className="flex items-start gap-2.5 text-zinc-200 my-1">
                    <span className="font-mono text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-bold">
                        {line.trim().split(" ")[0]}
                    </span>
                    <span className="leading-relaxed">{parseBoldText(line.trim().replace(/^\d+\.\s/, ""))}</span>
                </div>
            );
            i++;
            continue;
        }

        // 8. Empty Line Spacing
        if (!line.trim()) {
            elements.push(<div key={`sp-${i}`} className="h-1" />);
            i++;
            continue;
        }

        // 9. Regular Paragraph
        elements.push(
            <p key={`p-${i}`} className="text-zinc-200">
                {parseBoldText(line)}
            </p>
        );
        i++;
    }

    return (
        <div className="space-y-3 font-sans text-[14.5px] leading-relaxed text-zinc-100 tracking-normal">
            {elements}
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
                className={`max-w-[88%] sm:max-w-[82%] px-5 py-3.5 text-[14.5px] leading-relaxed rounded-2xl ${
                    isUser
                        ? "bg-gradient-to-r from-cyan-600/90 to-cyan-500/90 text-white rounded-tr-xs shadow-lg shadow-cyan-950/30 border border-cyan-400/30 font-medium"
                        : "bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 text-zinc-100 rounded-tl-xs shadow-xl shadow-black/40"
                }`}
            >
                {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                    <FormattedContent content={msg.content} />
                )}
            </div>
        </div>
    );
}

export default function BodyguardClient({ contextData }: { contextData?: any }) {
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Auto-expand textarea height up to 180px
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(180, Math.max(52, textareaRef.current.scrollHeight))}px`;
        }
    }, [input]);

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
        if (textareaRef.current) {
            textareaRef.current.style.height = "52px";
        }
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
            <div className="flex items-center justify-center min-h-[60vh] w-full">
                <div className="flex items-center gap-3 text-sm text-zinc-500 font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Loading AI Bodyguard...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex-1 flex flex-col relative min-h-[calc(100vh-6rem)]">
            
            {/* Background Pattern Layer */}
            <div 
                className={`fixed inset-0 ${currentPattern.opacity} pointer-events-none z-0 bg-repeat transition-all duration-300`}
                style={currentPattern.style}
            />

            {/* Sticky Top Control Bar */}
            <div className="sticky top-0 z-20 pb-4 pt-1 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 flex flex-wrap items-center justify-between gap-3 px-1">
                
                {/* Left: Mode Tabs */}
                <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-1 shadow-sm">
                    {(["chat", "weekly-report", "goal-planner"] as AgentMode[]).map(m => {
                        const isActive = mode === m;
                        return (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setMessages([]); setError(null); }}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
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

                {/* Right: Controls & Model Badge */}
                <div className="flex items-center gap-2.5">
                    
                    {/* Clear Chat Button */}
                    {messages.length > 0 && (
                        <button
                            onClick={clearConversation}
                            title="Reset Conversation"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-medium transition-colors shadow-sm"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset</span>
                        </button>
                    )}

                    {/* Wallpaper Theme Picker */}
                    <div className="relative flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-400 shadow-sm">
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

                    {/* Model Picker */}
                    <div className="relative">
                        {modelsLoading ? (
                            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
                                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                                <span>Nemotron...</span>
                            </div>
                        ) : modelsData?.models.length === 0 ? (
                            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
                                <AlertTriangle className="w-3 h-3" />
                                <span>No Model</span>
                            </div>
                        ) : (
                            <div className="relative flex items-center">
                                <select
                                    value={model}
                                    onChange={e => setModel(e.target.value)}
                                    className="appearance-none bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs font-medium rounded-xl px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:border-cyan-400 shadow-sm"
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

            {/* Unbounded Chat Message Stream */}
            <div className="flex-1 flex flex-col gap-5 py-6 pb-36 z-10 w-full">
                
                {messages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center max-w-lg mx-auto my-auto py-12 animate-in fade-in duration-300">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center shadow-xl shadow-cyan-950/40">
                            <Shield className="w-7 h-7 text-cyan-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-zinc-100 font-bold text-xl tracking-tight">
                                {mode === "weekly-report"
                                    ? "Performance Reality Check"
                                    : mode === "goal-planner"
                                    ? "Strategic Goal Decomposition"
                                    : "LifeOS AI Bodyguard & Mentor"}
                            </h2>
                            <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
                                {mode === "weekly-report"
                                    ? "Audits your focus history, uncovers hidden friction patterns, and detects stagnant goals."
                                    : mode === "goal-planner"
                                    ? "Decomposes monolithic ambitions into realistic daily focus blocks matching your true capacity."
                                    : "Objective reality-checker, strategic planner, and execution partner grounded in your real data."}
                            </p>
                        </div>

                        {mode === "weekly-report" ? (
                            <button
                                onClick={() => sendMessage("Generate my performance reality check report.")}
                                disabled={loading}
                                className="mt-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-cyan-950/50 flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Run Performance Audit</span>
                            </button>
                        ) : (
                            <div className="flex flex-wrap gap-2.5 justify-center mt-2 max-w-md">
                                {[
                                    "What should I focus on right now?",
                                    "Tell me about my progress and limitations",
                                    "Audit my goal momentum & bottlenecks",
                                ].map(sample => (
                                    <button
                                        key={sample}
                                        onClick={() => sendMessage(sample)}
                                        className="px-3.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/40 text-zinc-300 hover:text-cyan-300 text-xs font-medium transition-all shadow-sm"
                                    >
                                        {sample}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} />
                ))}

                {loading && (
                    <div className="flex gap-3 items-center z-10 bg-zinc-900/70 backdrop-blur-md border border-zinc-800/80 rounded-xl px-4 py-3 max-w-xs shadow-md animate-pulse">
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

            {/* Floating Multi-Line Input Dock */}
            <div className="sticky bottom-4 z-30 w-full pt-2">
                <div className="flex gap-3 items-end bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/90 focus-within:border-cyan-500/50 rounded-2xl p-2.5 shadow-2xl shadow-black/80 transition-colors">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={MODE_INFO[mode].placeholder}
                        disabled={loading}
                        className="flex-1 bg-transparent text-zinc-100 text-[14.5px] leading-relaxed px-3 py-2 resize-none focus:outline-none transition-all placeholder:text-zinc-600 disabled:opacity-50 min-h-[48px] max-h-[180px] overflow-y-auto"
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={loading || (!input.trim() && mode !== "weekly-report")}
                        className="px-4 h-[46px] bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-30 text-white rounded-xl transition-all flex items-center justify-center shadow-md shadow-cyan-950/40 shrink-0 border border-cyan-400/20 mb-0.5"
                    >
                        <Send className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
