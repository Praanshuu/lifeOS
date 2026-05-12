"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { Task, DailyPlanItem, PlanTier } from "@/types";
import { getTasks, deleteTaskAction, updateTaskStatus, startSession, stopSession, getSessionsForToday, startActivitySession, updatePlanItemStatus, commitTodaysPlan, reorderPlanItems, getTodaysPlan, removePlanItem, addPlanItem } from "@/app/actions";
import { DailyTimeline } from "./DailyTimeline";
import TaskInspector from "@/app/goals/TaskInspector";
import { CreateTaskModal } from "./CreateTaskModal";
import { Sparkles, CheckCircle2, SkipForward, AlertTriangle, RefreshCcw, Loader2, Lock, Zap, Target, TrendingUp, Coffee, GripVertical, Plus, Play, Square, ChevronDown, ChevronUp, X } from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<PlanTier, { label: string; color: string; border: string; bg: string; icon: React.ReactNode }> = {
    minimum: {
        label: "Non-Negotiable",
        color: "text-rose-400",
        border: "border-rose-400/20",
        bg: "bg-rose-400/10",
        icon: <Lock className="h-3 w-3" />,
    },
    target: {
        label: "Target",
        color: "text-amber-400",
        border: "border-amber-400/20",
        bg: "bg-amber-400/10",
        icon: <Target className="h-3 w-3" />,
    },
    stretch: {
        label: "Stretch",
        color: "text-sky-400",
        border: "border-sky-400/20",
        bg: "bg-sky-400/10",
        icon: <TrendingUp className="h-3 w-3" />,
    },
    refresh: {
        label: "Refresh",
        color: "text-emerald-400",
        border: "border-emerald-400/20",
        bg: "bg-emerald-400/10",
        icon: <Coffee className="h-3 w-3" />,
    },
};

const PRIORITY_DOT: Record<string, string> = {
    critical: "bg-rose-500",
    high: "bg-amber-500",
    medium: "bg-sky-500",
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#0a0a0b] border border-white/5 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                    {isBlocked ? "What's blocking you?" : "Why are we skipping this?"}
                </h3>
                <p className="text-xs text-zinc-500 mb-4">The AI will use this to coach your execution patterns.</p>
                
                <div className="flex flex-col gap-3 mb-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Root Cause</label>
                        <select 
                            value={trigger}
                            onChange={(e) => setTrigger(e.target.value)}
                            className="text-sm px-3 py-2 rounded-lg border border-white/5 bg-zinc-900/50 text-zinc-200 focus:outline-none focus:border-indigo-500/50"
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
                            className="text-sm px-3 py-2 rounded-lg border border-white/5 bg-transparent text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={onCancel} className="flex-1 text-sm py-2 rounded-lg border border-white/5 text-zinc-400 hover:bg-white/5 transition-colors">Cancel</button>
                    <button
                        onClick={() => onConfirm(reason || "Not specified", trigger)}
                        className="flex-1 text-sm py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                    >
                        Log Reflection
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TaskDashboard({ 
    initialTasks, 
    initialSessions, 
    initialGoals, 
    initialPlan,
    nudges
}: { 
    initialTasks: Task[], 
    initialSessions: any[], 
    initialGoals: any[],
    initialPlan: DailyPlanItem[],
    nudges: any[]
}) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [sessions, setSessions] = useState<any[]>(initialSessions || []);
    const [plan, setPlan] = useState<DailyPlanItem[]>(initialPlan || []);
    
    // Active session state
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    
    // UI state
    const [isGenerating, setIsGenerating] = useState(false);
    const [reflectionPrompt, setReflectionPrompt] = useState<{id: string, type: 'skipped' | 'blocked'} | null>(null);
    const [inspectorTask, setInspectorTask] = useState<Task | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showManualList, setShowManualList] = useState(false);
    const [showReality, setShowReality] = useState(false);
    const [intention, setIntention] = useState("");
    const [isPending, startTransition] = useTransition();

    // Drag state
    const draggedIdRef = useRef<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    // Initial data refresh
    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        const updatedTasks = await getTasks();
        const updatedSessions = await getSessionsForToday();
        const freshPlan = await getTodaysPlan();
        setTasks(updatedTasks as Task[]);
        setSessions(updatedSessions as any[]);
        setPlan(freshPlan as any[]);
    }

    // Timer Sync
    useEffect(() => {
        const openSession = sessions.find(s => s.endTime === null);
        if (openSession) {
            setActiveTaskId(openSession.taskId);
            setActiveActivityId(openSession.activityId);
            setActiveSessionId(openSession.id);
            setSessionStartTime(new Date(openSession.startTime));
        } else {
            setActiveTaskId(null);
            setActiveActivityId(null);
            setActiveSessionId(null);
            setSessionStartTime(null);
            setElapsedSeconds(0);
        }
    }, [sessions]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if ((activeTaskId || activeActivityId) && sessionStartTime) {
            const now = new Date();
            const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
            setElapsedSeconds(diff);
            interval = setInterval(() => {
                const currentNow = new Date();
                const currentDiff = Math.floor((currentNow.getTime() - sessionStartTime.getTime()) / 1000);
                setElapsedSeconds(currentDiff);
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => clearInterval(interval);
    }, [activeTaskId, activeActivityId, sessionStartTime]);

    // Actions
    const generatePlan = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch("/api/ai/plan/generate", { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ intention })
            });
            if (res.ok) {
                await refreshData();
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleSession = async (taskId: string) => {
        if (activeTaskId === taskId) {
            if (activeSessionId) await stopSession(activeSessionId);
            await refreshData();
        } else {
            if (activeSessionId) await stopSession(activeSessionId);
            await startSession(taskId);
            await refreshData();
        }
    }

    const handleQuickActivity = async (activityType: string) => {
        if (activeSessionId) await stopSession(activeSessionId);
        await startActivitySession(activityType);
        await refreshData();
    }

    const markStatus = (id: string, status: string, skipReason?: string, skipTrigger?: string) => {
        startTransition(async () => {
            await updatePlanItemStatus(id, status, skipReason, skipTrigger);
            setPlan(prev => prev.map(p =>
                p.id === id ? { 
                    ...p, 
                    status: status as any, 
                    skipReason: skipReason || (p as any).skipReason,
                    skipTrigger: skipTrigger || (p as any).skipTrigger
                } : p
            ));
            await refreshData(); // To sync task completion globally if needed
        });
    };

    const handleCommit = () => {
        startTransition(async () => {
            await commitTodaysPlan();
            setPlan(prev => prev.map(p => ({ ...p, committedAt: new Date().toISOString() })));
        });
    };

    const handleRemoveFromPlan = (id: string) => {
        startTransition(async () => {
            await removePlanItem(id);
            setPlan(prev => prev.filter(p => p.id !== id));
        });
    };

    const handleAddToPlan = (taskId: string, tier: string = "target") => {
        startTransition(async () => {
            const newItem = await addPlanItem(taskId, tier);
            const taskObj = tasks.find(t => t.id === taskId);
            setPlan(prev => [...prev, { 
                ...newItem, 
                taskTitle: taskObj?.title || "", 
                estimatedMinutes: taskObj?.estimatedMinutes || 30,
                priority: taskObj?.priority || "medium",
                spentMinutes: 0 
            } as any]);
        });
    };

    // Drag-and-drop logic
    const handleDragStart = (id: string) => { draggedIdRef.current = id; };
    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        if (draggedIdRef.current !== id) setDragOverId(id);
    };
    const handleDrop = (targetId: string) => {
        const sourceId = draggedIdRef.current;
        if (!sourceId || sourceId === targetId) { setDragOverId(null); return; }

        const stackIds = plan.filter(p => p.tier !== "refresh").map(p => p.id);
        const from = stackIds.indexOf(sourceId);
        const to = stackIds.indexOf(targetId);
        if (from === -1 || to === -1) return;

        const reordered = [...stackIds];
        reordered.splice(from, 1);
        reordered.splice(to, 0, sourceId);

        const refreshItems = plan.filter(p => p.tier === "refresh");
        const reorderedStack = reordered.map((id, i) => ({
            ...plan.find(p => p.id === id)!,
            position: i + 1,
        }));
        setPlan([...reorderedStack, ...refreshItems]);

        const date = plan[0]?.date ?? new Date().toISOString().split("T")[0];
        startTransition(async () => { await reorderPlanItems(date, reordered); });
        draggedIdRef.current = null;
        setDragOverId(null);
    };
    const handleDragEnd = () => { draggedIdRef.current = null; setDragOverId(null); };

    // Derived Data
    const isCommitted = plan.some(p => p.committedAt);
    const stackItems = plan.filter(p => p.tier !== "refresh");
    const doneCount = stackItems.filter(p => p.status === "done").length;
    const commitmentScore = stackItems.length > 0 ? Math.round((doneCount / stackItems.length) * 100) : 0;
    
    const todayFocusMinutes = plan.reduce((acc, p) => acc + (p.spentMinutes || 0), 0);
    const refreshSpent = plan.filter(p => p.tier === "refresh").reduce((acc, p) => acc + (p.spentMinutes || 0), 0);
    const refreshRatio = todayFocusMinutes > 0 ? (refreshSpent / todayFocusMinutes) * 100 : 0;

    const stackPlan = plan.filter(p => p.tier !== "refresh");
    const refreshPool = plan.filter(p => p.tier === "refresh");

    // Manual tasks calculation (tasks not in today's plan)
    const planTaskIds = new Set(plan.map(p => p.taskId));
    // Parent tasks that have children are composite — not directly actionable in backlog
    const parentIds = new Set(tasks.filter(t => t.parentTaskId).map(t => t.parentTaskId!));
    // Sort manual tasks by priority
    const priorityWeights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const manualTasks = tasks
        .filter(t => !planTaskIds.has(t.id) && t.status !== 'completed' && !parentIds.has(t.id))
        .sort((a, b) => (priorityWeights[b.priority || "medium"] || 0) - (priorityWeights[a.priority || "medium"] || 0));

    // Timer formatting
    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    let activeTitle = "Idle";
    let activeColor = "text-zinc-500";
    let activeBg = "bg-zinc-900/50";
    if (activeTaskId) {
        activeTitle = tasks.find(t => t.id === activeTaskId)?.title || "Focusing...";
        activeColor = "text-indigo-400";
        activeBg = "bg-indigo-500/10 border-indigo-500/20";
    } else if (activeActivityId) {
        const activeSession = sessions.find(s => s.activityId === activeActivityId && s.endTime === null);
        if (activeSession) {
            activeTitle = activeSession.activityName || activeSession.type || "Activity...";
            if (activeSession.type === 'break') { activeColor = "text-emerald-400"; activeBg = "bg-emerald-500/10 border-emerald-500/20"; }
            if (activeSession.type === 'distraction') { activeColor = "text-rose-400"; activeBg = "bg-rose-500/10 border-rose-500/20"; }
        }
    }

    return (
        <>
            {/* Modals */}
            <CreateTaskModal 
                isOpen={isCreateModalOpen} 
                onClose={() => { setIsCreateModalOpen(false); refreshData(); }} 
                goals={initialGoals} 
            />
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
            {inspectorTask && (
                <TaskInspector 
                    task={inspectorTask} 
                    goals={initialGoals}
                    allTasks={tasks}
                    onClose={() => { setInspectorTask(null); refreshData(); }} 
                />
            )}

            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 xl:gap-16 w-full">
                
                {/* Center Column: Execution Cockpit */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
                    
                    {/* Header */}
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 pt-2 shrink-0">
                        <div>
                            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Focus Today</h1>
                            <p className="text-sm text-zinc-400">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <input 
                                type="text"
                                placeholder="Steer AI: e.g. Focus on Exam"
                                value={intention}
                                onChange={(e) => setIntention(e.target.value)}
                                className="hidden sm:block text-xs px-3 py-2.5 rounded-xl border border-white/5 bg-zinc-900/50 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 w-48 transition-colors"
                             />
                             <button
                                onClick={generatePlan}
                                disabled={isGenerating}
                                className="flex items-center gap-2 bg-[#0a0a0b] hover:bg-zinc-900 text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60 border border-white/5"
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin text-indigo-400" /> : <Sparkles className="h-4 w-4 text-indigo-400" />}
                                Generate Plan
                            </button>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-lg shadow-indigo-500/10"
                            >
                                <Plus className="h-4 w-4" /> Add Task
                            </button>
                        </div>
                    </header>

                    {/* AI Priority Stack */}
                    <div className="flex flex-col gap-4 mb-8">
                         <div className="flex items-center justify-between">
                            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> AI Priority Stack
                            </h2>
                            {isCommitted && (
                                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-900/50 px-2.5 py-1 rounded-full border border-white/5">
                                    <span className={commitmentScore >= 66 ? "text-sky-400" : commitmentScore >= 33 ? "text-amber-400" : "text-zinc-500"}>
                                        {commitmentScore}%
                                    </span>
                                    <span className="text-zinc-500">committed</span>
                                </div>
                            )}
                        </div>

                        {plan.length === 0 ? (
                             <div className="border border-dashed border-white/10 bg-zinc-900/10 rounded-3xl p-12 flex flex-col items-center justify-center gap-5 text-center min-h-[300px] w-full">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                                    <Sparkles className="h-8 w-8 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-zinc-200">No stack generated</h3>
                                    <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto leading-relaxed">
                                        Let the AI build your execution stack based on task urgency, historical capacity, and deadlines.
                                    </p>
                                </div>
                                <button
                                    onClick={generatePlan}
                                    disabled={isGenerating}
                                    className="mt-2 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-60 shadow-lg shadow-indigo-500/20"
                                >
                                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Sparkles className="h-4 w-4 text-white" />}
                                    Generate Plan Now
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {/* Active Stack */}
                                {stackPlan.filter(item => item.status === 'planned').map((item) => {
                                    const cfg = TIER_CONFIG[item.tier as PlanTier];
                                    const isActive = activeTaskId === item.taskId;
                                    const canDrag = !isCommitted;
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
                                                "group flex items-stretch gap-3 bg-[#0a0a0b] border border-white/5 rounded-xl transition-all overflow-hidden",
                                                "hover:border-white/10 hover:shadow-md hover:shadow-black/20",
                                                isActive ? "border-indigo-500/30 ring-1 ring-indigo-500/20 shadow-indigo-500/5 shadow-lg" : "",
                                                isDragTarget ? "border-indigo-500/50 scale-[1.01]" : ""
                                            ].join(" ")}
                                        >
                                            <div className={`w-1.5 shrink-0 ${cfg.bg}`} />
                                            <div className="flex flex-col items-center justify-center px-1 w-6">
                                                 {canDrag ? (
                                                    <GripVertical className="h-4 w-4 text-zinc-700 hover:text-zinc-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
                                                 ) : (
                                                    <span className="text-[10px] font-mono text-zinc-700">{item.position}</span>
                                                 )}
                                            </div>

                                            <div className="flex-1 min-w-0 py-3 pr-4 flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setInspectorTask(tasks.find(t => t.id === item.taskId) || null)}>
                                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                        <span className={`flex items-center gap-1 text-[10px] font-medium tracking-wide px-1.5 py-0.5 rounded-md border ${cfg.border} ${cfg.color} ${cfg.bg}`}>
                                                            {cfg.icon} {cfg.label}
                                                        </span>
                                                        {tasks.find(t => t.id === item.taskId)?.parentTaskTitle && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 font-mono truncate max-w-[120px]">
                                                                ↳ {tasks.find(t => t.id === item.taskId)?.parentTaskTitle}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-sm font-medium leading-snug truncate text-zinc-200">
                                                        {item.taskTitle}
                                                    </h3>
                                                    {item.rationale && (
                                                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed line-clamp-1">{item.rationale}</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="hidden sm:flex items-center gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!isCommitted && (
                                                            <button onClick={() => handleRemoveFromPlan(item.id)} title="Remove from Plan" className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"><X className="w-4 h-4" /></button>
                                                        )}
                                                        <button onClick={() => markStatus(item.id, "done")} title="Mark Done" className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"><CheckCircle2 className="w-4 h-4" /></button>
                                                        <button onClick={() => setReflectionPrompt({ id: item.id, type: 'blocked' })} title="Declare Blocker" className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"><AlertTriangle className="w-4 h-4" /></button>
                                                        <button onClick={() => setReflectionPrompt({ id: item.id, type: 'skipped' })} title="Skip" className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg"><SkipForward className="w-4 h-4" /></button>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); toggleSession(item.taskId); }}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20'}`}
                                                    >
                                                        {isActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                                        {isActive ? "Stop" : "Start"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Inactive Section */}
                                {stackPlan.some(item => item.status !== 'planned') && (
                                    <div className="mt-4 flex flex-col gap-2">
                                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-1">Finished Today</h3>
                                        {stackPlan.filter(item => item.status !== 'planned').map((item) => {
                                            const isDone = item.status === "done";
                                            const isBlocked = item.status === "blocked";
                                            const isSkipped = item.status === "skipped";
                                            const cfg = TIER_CONFIG[item.tier as PlanTier];

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center gap-3 bg-zinc-900/10 border border-white/5 rounded-xl px-4 py-3 opacity-40 grayscale-[0.5]"
                                                >
                                                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${isDone ? 'text-emerald-500' : isBlocked ? 'text-rose-500' : 'text-zinc-500'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className={`text-sm font-medium truncate ${isDone ? "line-through text-zinc-500" : "text-zinc-500"}`}>
                                                            {item.taskTitle}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-mono text-zinc-600 capitalize">{item.status}</span>
                                                            {item.skipReason && (
                                                                <span className="text-[10px] text-zinc-600 truncate italic"> — {item.skipReason}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {!isCommitted && plan.length > 0 && (
                                    <button
                                        onClick={handleCommit}
                                        disabled={isPending}
                                        className="mt-2 w-full py-2.5 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Zap className="h-3.5 w-3.5" /> Commit to Stack
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Refresh Pool */}
                    {refreshPool.length > 0 && (
                        <div className="flex flex-col gap-3 mb-8">
                            <h2 className="text-xs font-semibold text-emerald-500/70 uppercase tracking-widest flex items-center gap-2">
                                <Coffee className="w-3.5 h-3.5" /> Refresh Pool
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {refreshPool.map(item => {
                                    const isActive = activeTaskId === item.taskId;
                                    const isDone = item.status === "done";
                                    return (
                                        <div key={item.id} className="flex items-center justify-between gap-3 bg-[#0a0a0b] border border-white/5 p-3 rounded-xl hover:border-white/10 transition-all">
                                             <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setInspectorTask(tasks.find(t => t.id === item.taskId) || null)}>
                                                <h3 className={`text-xs font-medium truncate ${isDone ? "line-through text-zinc-600" : "text-zinc-300"}`}>{item.taskTitle}</h3>
                                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">~{item.estimatedMinutes}m</p>
                                             </div>
                                             {!isDone && (
                                                 <div className="flex items-center gap-1 shrink-0">
                                                     {!isCommitted && (
                                                         <button onClick={() => handleRemoveFromPlan(item.id)} title="Remove from Plan" className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                                     )}
                                                     <button onClick={() => markStatus(item.id, "done")} className="p-1 text-zinc-500 hover:text-emerald-400 transition-colors"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                                                     <button 
                                                        onClick={() => toggleSession(item.taskId)}
                                                        className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-rose-500/10 text-rose-400' : 'bg-zinc-800/50 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
                                                    >
                                                        {isActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                                    </button>
                                                 </div>
                                             )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Manual Fallback Tasks */}
                    <div className="mt-4">
                        <button 
                            onClick={() => setShowManualList(!showManualList)}
                            className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-zinc-900/30 transition-colors border border-transparent hover:border-white/5 text-left"
                        >
                            <span className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                                Manual Task Backlog 
                                <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[10px]">{manualTasks.length}</span>
                            </span>
                            {showManualList ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                        </button>
                        
                        {showManualList && (
                            <div className="flex flex-col gap-1 mt-2">
                                {manualTasks.map(task => {
                                    const isActive = activeTaskId === task.id;
                                    return (
                                        <div key={task.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-zinc-900/40 transition-colors group">
                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority || "medium"]}`} />
                                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setInspectorTask(task)}>
                                                {task.parentTaskTitle && (
                                                    <p className="text-[10px] text-indigo-400/60 font-mono truncate">↳ {task.parentTaskTitle}</p>
                                                )}
                                                <span className="text-sm text-zinc-400 hover:text-zinc-200 truncate transition-colors block">
                                                    {task.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!isCommitted && plan.length > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={() => handleAddToPlan(task.id, "target")}
                                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all bg-zinc-800/50 text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400"
                                                        >
                                                            <Plus className="w-3 h-3" /> Add
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAddToPlan(task.id, "refresh")}
                                                            title="Add to Refresh Pool"
                                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold transition-all bg-zinc-800/50 text-zinc-400 hover:bg-sky-500/10 hover:text-sky-400"
                                                        >
                                                            <Coffee className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={() => toggleSession(task.id)}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${isActive ? 'bg-rose-500/10 text-rose-400 opacity-100' : 'bg-zinc-800/50 text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-400'}`}
                                                >
                                                    {isActive ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                                                    {isActive ? "Stop" : "Start"}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                                {manualTasks.length === 0 && (
                                    <p className="text-xs text-zinc-600 px-3 py-2">All pending tasks are in your stack.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Persistent Sidebar */}
                <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col gap-6 pb-6">
                    <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-2">Active Session</h2>
                    
                    {/* Timer Widget */}
                    <div className={`relative overflow-hidden rounded-3xl border ${activeTaskId || activeActivityId ? 'border-indigo-500/20 bg-[#0a0a0b]' : 'border-white/5 bg-zinc-900/20'} flex flex-col items-center justify-center p-6 min-h-[300px] shadow-2xl transition-colors duration-500`}>
                        {(activeTaskId || activeActivityId) && (
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent pointer-events-none z-0"></div>
                        )}
                        
                        <div className="z-10 flex flex-col items-center text-center w-full">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${activeBg} ${activeColor} mb-6`}>
                                {activeTaskId || activeActivityId ? 'Recording' : 'Idle Engine'}
                            </span>
                            
                            <div className="text-5xl font-mono font-black text-zinc-100 tracking-tighter tabular-nums drop-shadow-md mb-4">
                                {formatTime(elapsedSeconds)}
                            </div>
                            
                            <p className="text-sm font-medium text-zinc-300 truncate w-full px-2 max-w-[200px]">
                                {activeTitle}
                            </p>
                        </div>
                        
                        {(activeTaskId || activeActivityId) && (
                            <div className="absolute bottom-6 w-full px-6 z-10 animate-in fade-in slide-in-from-bottom-2">
                                <button 
                                    onClick={() => activeSessionId && stopSession(activeSessionId)}
                                    className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Square className="w-4 h-4 fill-current" /> Stop Timer
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quick Activities */}
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <button 
                            onClick={() => handleQuickActivity("break")}
                            className="bg-zinc-900/40 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/20 text-xs font-semibold py-4 rounded-2xl transition-all flex flex-col items-center gap-2 shadow-sm"
                        >
                            <Coffee className="w-5 h-5" />
                            Take Break
                        </button>
                        <button 
                            onClick={() => handleQuickActivity("distraction")}
                            className="bg-zinc-900/40 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 text-xs font-semibold py-4 rounded-2xl transition-all flex flex-col items-center gap-2 shadow-sm"
                        >
                            <AlertTriangle className="w-5 h-5" />
                            Distraction
                        </button>
                    </div>

                    {/* Daily Reality Mini-Summary */}
                    <div className="mt-4 flex flex-col gap-2">
                        <button 
                            onClick={() => setShowReality(!showReality)}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/30 transition-colors w-full border border-transparent hover:border-white/5"
                        >
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Daily Reality</span>
                            {showReality ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronUp className="w-4 h-4 text-zinc-500" />}
                        </button>
                        
                        {showReality && (
                            <div className="p-4 rounded-2xl border border-white/5 bg-[#0a0a0b] shadow-inner animate-in fade-in slide-in-from-bottom-2">
                                <DailyTimeline sessions={sessions} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}