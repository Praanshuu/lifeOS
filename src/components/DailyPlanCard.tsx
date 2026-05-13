"use client";

import { useState, useTransition, useRef } from "react";
import { DailyPlanItem, PlanTier } from "@/types";
import { updatePlanItemStatus, commitTodaysPlan, getTodaysPlan, reorderPlanItems, completeTaskManually } from "@/app/actions";
import { Sparkles, CheckCircle2, SkipForward, AlertTriangle, RefreshCcw, Loader2, Lock, Zap, Target, TrendingUp, Coffee, GripVertical } from "lucide-react";
import ManualCompletionModal from "./ManualCompletionModal";

// ─── Config ───────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<PlanTier, { label: string; color: string; border: string; bg: string; icon: React.ReactNode }> = {
    minimum: {
        label: "Non-Negotiable",
        color: "text-red-400",
        border: "border-red-500/30",
        bg: "bg-red-500/5",
        icon: <Lock className="h-3 w-3" />,
    },
    target: {
        label: "Target",
        color: "text-amber-400",
        border: "border-amber-500/30",
        bg: "bg-amber-500/5",
        icon: <Target className="h-3 w-3" />,
    },
    stretch: {
        label: "Stretch",
        color: "text-cyan-400",
        border: "border-cyan-500/30",
        bg: "bg-cyan-500/5",
        icon: <TrendingUp className="h-3 w-3" />,
    },
    refresh: {
        label: "Refresh",
        color: "text-green-400",
        border: "border-green-500/30",
        bg: "bg-green-500/5",
        icon: <Coffee className="h-3 w-3" />,
    },
};

const PRIORITY_DOT: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-400",
    medium: "bg-yellow-400",
    low: "bg-zinc-500",
};

// ─── Reflection Modal ────────────────────────────────────────────────────────────

function SkipReflectionModal({ type, onConfirm, onCancel }: { type: "skipped" | "blocked", onConfirm: (reason: string, trigger: string) => void; onCancel: () => void }) {
    const [reason, setReason] = useState("");
    const [trigger, setTrigger] = useState("avoidance");
    
    const triggers = [
        { id: "avoidance", label: "Task Avoidance" },
        { id: "burnout", label: "Burnout / Fatigue" },
        { id: "distraction", label: "Distraction / Interruption" },
        { id: "energy", label: "Low Energy" },
        { id: "technical", label: "Technical Blocker" }
    ];

    const isBlocked = type === "blocked";

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-sm font-semibold text-zinc-100 mb-1">
                    {isBlocked ? "What's blocking you?" : "Why are we skipping this?"}
                </h3>
                <p className="text-xs text-zinc-500 mb-4">The AI will use this to coach your execution patterns.</p>
                
                <div className="flex flex-col gap-3 mb-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Root Cause</label>
                        <select 
                            value={trigger}
                            onChange={(e) => setTrigger(e.target.value)}
                            className="text-sm px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                        >
                            {triggers.map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Details (Optional)</label>
                        <input
                            type="text"
                            placeholder="E.g. missing info, feeling overwhelmed..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="text-sm px-3 py-2 rounded-lg border border-zinc-800 bg-transparent text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={onCancel} className="flex-1 text-sm py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 transition-colors">Cancel</button>
                    <button
                        onClick={() => onConfirm(reason || "Not specified", trigger)}
                        className="flex-1 text-sm py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                    >
                        Log Reflection
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyPlanCard({ initialPlan }: { initialPlan: DailyPlanItem[] }) {
    const [plan, setPlan] = useState<DailyPlanItem[]>(initialPlan);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reflectionPrompt, setReflectionPrompt] = useState<{id: string, type: 'skipped' | 'blocked'} | null>(null);
    const [completionPrompt, setCompletionPrompt] = useState<{id: string, title: string, estimatedMinutes: number, taskId: string} | null>(null);
    const [isPending, startTransition] = useTransition();

    // Drag state — using a ref for the dragged ID avoids stale closure issues
    const draggedIdRef = useRef<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    const isCommitted = plan.some(p => p.committedAt);

    // ── Derived metrics ───────────────────────────────────────────────────────

    const stackItems = plan.filter(p => p.tier !== "refresh");
    const doneCount = stackItems.filter(p => p.status === "done").length;
    const commitmentScore = stackItems.length > 0 ? Math.round((doneCount / stackItems.length) * 100) : 0;

    const todayFocusMinutes = plan.reduce((acc, p) => acc + (p.spentMinutes || 0), 0);
    const refreshSpent = plan.filter(p => p.tier === "refresh").reduce((acc, p) => acc + (p.spentMinutes || 0), 0);
    const refreshRatio = todayFocusMinutes > 0 ? (refreshSpent / todayFocusMinutes) * 100 : 0;

    // ── Plan actions ──────────────────────────────────────────────────────────

    const generatePlan = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch("/api/ai/plan/generate", { method: "POST" });
            if (res.ok) {
                const fresh = await getTodaysPlan();
                setPlan(fresh as any);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const markStatus = (id: string, status: string, skipReason?: string, skipTrigger?: string) => {
        startTransition(async () => {
            await updatePlanItemStatus(id, status, skipReason, skipTrigger);
            setPlan(prev => prev.map(p => {
                if (p.id === id) {
                    return { 
                        ...p, 
                        status: status as any, 
                        // Note: Depending on your DailyPlanItem type, you might need to use blockerReason or skipReason.
                        // Since we updated schema.ts to skipReason and skipTrigger, we use them here.
                        skipReason: skipReason || (p as any).skipReason, 
                        skipTrigger: skipTrigger || (p as any).skipTrigger 
                    };
                }
                return p;
            }));
        });
    };

    const handleManualCompletion = (id: string, taskId: string, spentMinutes: number, notes: string) => {
        startTransition(async () => {
            await completeTaskManually(taskId, spentMinutes, notes);
            setPlan(prev => prev.map(p => p.id === id ? { ...p, status: 'done', spentMinutes: (p.spentMinutes || 0) + spentMinutes } as any : p));
        });
    };

    const handleCommit = () => {
        startTransition(async () => {
            await commitTodaysPlan();
            setPlan(prev => prev.map(p => ({ ...p, committedAt: new Date().toISOString() })));
        });
    };

    // ── Drag-and-drop (stack only — refresh pool is unordered) ────────────────

    const handleDragStart = (id: string) => {
        draggedIdRef.current = id;
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault(); // required for onDrop to fire
        if (draggedIdRef.current !== id) setDragOverId(id);
    };

    const handleDrop = (targetId: string) => {
        const sourceId = draggedIdRef.current;
        if (!sourceId || sourceId === targetId) {
            setDragOverId(null);
            return;
        }

        const stackIds = plan.filter(p => p.tier !== "refresh").map(p => p.id);
        const from = stackIds.indexOf(sourceId);
        const to = stackIds.indexOf(targetId);
        if (from === -1 || to === -1) return;

        // Splice into new order
        const reordered = [...stackIds];
        reordered.splice(from, 1);
        reordered.splice(to, 0, sourceId);

        // Optimistic update — reassign positions, preserve refresh items
        const refreshItems = plan.filter(p => p.tier === "refresh");
        const reorderedStack = reordered.map((id, i) => ({
            ...plan.find(p => p.id === id)!,
            position: i + 1,
        }));
        setPlan([...reorderedStack, ...refreshItems]);

        // Persist to DB
        const date = plan[0]?.date ?? new Date().toISOString().split("T")[0];
        startTransition(async () => {
            await reorderPlanItems(date, reordered);
        });

        draggedIdRef.current = null;
        setDragOverId(null);
    };

    const handleDragEnd = () => {
        draggedIdRef.current = null;
        setDragOverId(null);
    };

    // ── Empty state ───────────────────────────────────────────────────────────

    if (plan.length === 0) {
        return (
            <div className="border border-zinc-800/80 bg-zinc-950/50 rounded-2xl p-6 flex flex-col items-center gap-4 text-center shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-zinc-100 mb-1">No plan for today</h2>
                    <p className="text-xs text-zinc-500">The AI will analyse your goals, deadlines, and focus patterns to generate your priority stack.</p>
                </div>
                <button
                    onClick={generatePlan}
                    disabled={isGenerating}
                    className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isGenerating ? "Generating..." : "Generate Today's Plan"}
                </button>
            </div>
        );
    }

    const stackPlan = plan.filter(p => p.tier !== "refresh");
    const refreshPool = plan.filter(p => p.tier === "refresh");

    return (
        <>
            {reflectionPrompt && (
                <SkipReflectionModal
                    type={reflectionPrompt.type}
                    onConfirm={(reason, trigger) => { 
                        markStatus(reflectionPrompt.id, reflectionPrompt.type, reason, trigger); 
                        setReflectionPrompt(null); 
                    }}
                    onCancel={() => setReflectionPrompt(null)}
                />
            )}

            {completionPrompt && (
                <ManualCompletionModal
                    taskTitle={completionPrompt.title}
                    estimatedMinutes={completionPrompt.estimatedMinutes}
                    onConfirm={(spentMinutes, notes) => {
                        handleManualCompletion(completionPrompt.id, completionPrompt.taskId, spentMinutes, notes);
                        setCompletionPrompt(null);
                    }}
                    onCancel={() => setCompletionPrompt(null)}
                />
            )}

            <div className="border border-zinc-800/80 bg-zinc-950/50 rounded-2xl overflow-hidden shadow-sm">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-cyan-500" />
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-100">Today's Priority Stack</h2>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                AI-generated · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isCommitted && (
                            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
                                <span className={commitmentScore >= 66 ? "text-cyan-400" : commitmentScore >= 33 ? "text-amber-400" : "text-zinc-500"}>
                                    {commitmentScore}%
                                </span>
                                <span className="text-zinc-600">committed</span>
                            </div>
                        )}
                        <button
                            onClick={generatePlan}
                            disabled={isGenerating}
                            title="Regenerate plan"
                            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors disabled:opacity-40"
                        >
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Reorder hint — only before commit, only when there are multiple stack items */}
                {!isCommitted && stackPlan.length > 1 && (
                    <div className="px-5 py-2 border-b border-zinc-800/40 bg-zinc-900/20 flex items-center gap-1.5">
                        <GripVertical className="h-3 w-3 text-zinc-700" />
                        <p className="text-[10px] text-zinc-600">Drag to reorder before committing.</p>
                    </div>
                )}

                {/* Refresh tax warning */}
                {refreshRatio > 20 && (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/5 border-b border-amber-500/20 text-xs text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{Math.round(refreshRatio)}% of your logged time today was in the Refresh Pool. Your stack is waiting.</span>
                    </div>
                )}

                {/* Priority stack */}
                <div className="divide-y divide-zinc-800/50">
                    {stackPlan.map((item) => {
                        const cfg = TIER_CONFIG[item.tier as PlanTier];
                        const isDone    = item.status === "done";
                        const isBlocked = item.status === "blocked";
                        const isSkipped = item.status === "skipped";
                        const inactive  = isDone || isBlocked || isSkipped;
                        const canDrag   = !isCommitted && !inactive;
                        const isDragTarget = dragOverId === item.id;

                        return (
                            <div
                                key={item.id}
                                draggable={canDrag}
                                onDragStart={() => handleDragStart(item.id)}
                                onDragOver={(e) => handleDragOver(e, item.id)}
                                onDrop={() => handleDrop(item.id)}
                                onDragEnd={handleDragEnd}
                                className={[
                                    "flex items-start gap-3 px-4 py-4 transition-all select-none",
                                    inactive ? "opacity-50" : "",
                                    isDragTarget ? "bg-cyan-500/5 border-l-2 border-l-cyan-500/50" : "border-l-2 border-l-transparent hover:bg-zinc-900/30",
                                    canDrag ? "cursor-grab active:cursor-grabbing" : "",
                                ].join(" ")}
                            >
                                {/* Drag handle */}
                                <div className="pt-1 shrink-0 w-4">
                                    {canDrag && (
                                        <GripVertical className="h-3.5 w-3.5 text-zinc-700 hover:text-zinc-500 transition-colors" />
                                    )}
                                </div>

                                {/* Position + priority dot */}
                                <div className="flex flex-col items-center gap-1.5 pt-0.5 shrink-0">
                                    <span className="text-xs font-mono text-zinc-600">{item.position}</span>
                                    <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[item.priority] ?? "bg-zinc-600"}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${cfg.color} ${cfg.border} ${cfg.bg}`}>
                                            {cfg.icon} {cfg.label}
                                        </span>
                                        {item.allocatedMinutes !== null && item.allocatedMinutes !== undefined && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/5 text-amber-400 font-mono flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" /> {item.allocatedMinutes}m today (of {item.estimatedMinutes}m)
                                            </span>
                                        )}
                                        {isBlocked && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-red-500/20 bg-red-500/5 text-red-400">
                                                Blocked: {(item as any).skipTrigger} / {(item as any).skipReason}
                                            </span>
                                        )}
                                        {isSkipped && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-zinc-500/20 bg-zinc-500/10 text-zinc-400">
                                                Skipped: {(item as any).skipTrigger}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className={`text-sm font-medium leading-snug ${isDone ? "line-through text-zinc-600" : "text-zinc-200"}`}>
                                        {item.taskTitle}
                                    </h3>
                                    {item.rationale && (
                                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{item.rationale}</p>
                                    )}
                                    <p className="mt-1.5 text-[11px] font-mono text-zinc-600">
                                        {item.spentMinutes > 0 ? `${Math.round(item.spentMinutes)}m logged` : `~${item.estimatedMinutes}m`}
                                    </p>
                                </div>

                                {/* Status actions */}
                                {!inactive && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => setCompletionPrompt({ 
                                                id: item.id, 
                                                title: item.taskTitle || "Task", 
                                                estimatedMinutes: item.estimatedMinutes || 30,
                                                taskId: item.taskId
                                            })}
                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                                            title="Mark done"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setReflectionPrompt({ id: item.id, type: 'blocked' })}
                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title="Declare blocker"
                                        >
                                            <AlertTriangle className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setReflectionPrompt({ id: item.id, type: 'skipped' })}
                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                                            title="Skip"
                                        >
                                            <SkipForward className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Refresh Pool */}
                {refreshPool.length > 0 && (
                    <div className="border-t border-zinc-800/80 bg-zinc-900/20">
                        <div className="px-5 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-2 flex items-center gap-1.5">
                                <Coffee className="h-3 w-3" /> Refresh Pool — grab when drained
                            </p>
                            <div className="flex flex-col gap-1.5">
                                {refreshPool.map(item => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                                        <span className={`flex-1 text-zinc-400 ${item.status === "done" ? "line-through text-zinc-600" : ""}`}>
                                            {item.taskTitle}
                                            <span className="text-zinc-600 font-mono ml-2 text-xs">~{item.estimatedMinutes}m</span>
                                        </span>
                                        {item.status !== "done" && (
                                            <button
                                                onClick={() => markStatus(item.id, "done")}
                                                className="p-1 rounded text-zinc-600 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Commit bar */}
                {!isCommitted && plan.length > 0 && (
                    <div className="px-5 py-3.5 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between gap-3">
                        <p className="text-xs text-zinc-500">Ready to commit to today's plan?</p>
                        <button
                            onClick={handleCommit}
                            disabled={isPending}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Zap className="h-3.5 w-3.5" /> I commit
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
