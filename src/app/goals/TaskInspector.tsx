"use client"

import { Task } from "@/types"
import { useState, useEffect, useTransition } from "react"
import { X, Calendar as CalendarIcon, Target, Battery, Clock, CheckCircle2, Sparkles, Loader2, ListTree } from "lucide-react"
import { updateTaskDetails, completeTaskManually } from "@/app/actions"
import ManualCompletionModal from "@/components/ManualCompletionModal"

export default function TaskInspector({ 
    task, 
    goals, 
    allTasks = [],
    onClose 
}: { 
    task: Task, 
    goals: any[],
    allTasks?: Task[],
    onClose: () => void 
}) {
    const [isPending, startTransition] = useTransition()
    const [localTask, setLocalTask] = useState(task)
    const [breakdownGuidance, setBreakdownGuidance] = useState("")
    const [isBreakingDown, setIsBreakingDown] = useState(false)
    const [completionPrompt, setCompletionPrompt] = useState<{id: string, title: string, estimatedMinutes: number} | null>(null)

    const handleBreakdown = async () => {
        setIsBreakingDown(true);
        try {
            const res = await fetch("/api/ai/breakdown", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId: localTask.id,
                    title: localTask.title,
                    goalId: localTask.goalId,
                    dueDate: localTask.dueDate,
                    guidance: breakdownGuidance
                })
            });
            if (res.ok) {
                setBreakdownGuidance("");
                onClose(); // Triggers a global refresh in Dashboard
            }
        } finally {
            setIsBreakingDown(false);
        }
    }

    const subTasks = allTasks.filter(t => t.parentTaskId === localTask.id).sort((a, b) => {
        if (!a.scheduledDate || !b.scheduledDate) return 0;
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    });

    useEffect(() => {
        setLocalTask(task)
    }, [task])

    const handleUpdate = (updates: Partial<Task>) => {
        const newData = { ...localTask, ...updates }
        setLocalTask(newData as Task)
        
        startTransition(() => {
            updateTaskDetails(task.id, {
                title: newData.title,
                status: newData.status,
                goalId: newData.goalId,
                dueDate: newData.dueDate ? new Date(newData.dueDate) : null,
                scheduledDate: newData.scheduledDate ? new Date(newData.scheduledDate) : null,
                energyLevel: newData.energyLevel,
                estimatedMinutes: newData.estimatedMinutes,
                anticipatedFriction: newData.anticipatedFriction,
                parentTaskId: newData.parentTaskId
            })
        })
    }

    const handleStatusChange = (newStatus: string) => {
        if (newStatus === 'completed') {
            setCompletionPrompt({
                id: localTask.id,
                title: localTask.title || "Task",
                estimatedMinutes: localTask.estimatedMinutes || 30
            });
        } else {
            handleUpdate({ status: newStatus as any });
        }
    };

    const handleManualCompletion = (spentMinutes: number, notes: string) => {
        startTransition(async () => {
            await completeTaskManually(localTask.id, spentMinutes, notes);
            setLocalTask({ ...localTask, status: 'completed', spentMinutes: (localTask.spentMinutes || 0) + spentMinutes });
        });
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalTask({ ...localTask, title: e.target.value })
    }

    const handleTitleBlur = () => {
        if (localTask.title !== task.title) {
            handleUpdate({ title: localTask.title })
        }
    }

    return (
        <>
            {completionPrompt && (
                <ManualCompletionModal
                    taskTitle={completionPrompt.title}
                    estimatedMinutes={completionPrompt.estimatedMinutes}
                    onConfirm={(spentMinutes, notes) => {
                        handleManualCompletion(spentMinutes, notes);
                        setCompletionPrompt(null);
                    }}
                    onCancel={() => setCompletionPrompt(null)}
                />
            )}
            <div className="fixed inset-y-0 right-0 w-[400px] bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-950">
                <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-400">Task Detail</h2>
                <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-md hover:bg-zinc-900">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-10">
                
                {/* Parent breadcrumb for micro-tasks */}
                {localTask.parentTaskTitle && (
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-400/70 font-mono mb-0">
                        <span className="text-zinc-600">↳</span>
                        <span>{localTask.parentTaskTitle}</span>
                    </div>
                )}

                {/* Title Section */}
                <div className="flex flex-col gap-3">
                    <input 
                        type="text"
                        value={localTask.title}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        className="text-xl font-medium text-zinc-100 leading-snug bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-zinc-600 w-full"
                        placeholder="Task Title..."
                    />
                    <div className="flex items-center gap-2">
                        <select 
                            value={localTask.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium outline-none appearance-none cursor-pointer ${
                                localTask.status === 'completed' ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20' : 
                                localTask.status === 'in-progress' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                        >
                            <option value="pending" className="bg-zinc-900 text-zinc-400">pending</option>
                            <option value="in-progress" className="bg-zinc-900 text-amber-400">in progress</option>
                            <option value="completed" className="bg-zinc-900 text-cyan-400">completed</option>
                            <option value="skipped" className="bg-zinc-900 text-zinc-400">skipped</option>
                            <option value="rescheduled" className="bg-zinc-900 text-zinc-400">rescheduled</option>
                        </select>
                        {isPending && <span className="text-xs text-zinc-500 animate-pulse font-mono">Saving...</span>}
                    </div>
                </div>

                {/* Properties Section */}
                <div className="flex flex-col gap-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">Properties</h3>
                    
                    {/* Goal Mapping */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 text-zinc-400 text-sm">
                            <Target className="h-4 w-4" />
                            <span>Objective</span>
                        </div>
                        <select 
                            value={localTask.goalId || ""} 
                            onChange={(e) => handleUpdate({ goalId: e.target.value || null })}
                            className="bg-transparent text-right text-sm text-zinc-200 border border-transparent hover:border-zinc-800 focus:border-zinc-700 rounded-md px-2 py-1 outline-none transition-colors max-w-[200px]"
                        >
                            <option value="" className="bg-zinc-900 text-zinc-500">None</option>
                            {goals.map(g => (
                                <option key={g.id} value={g.id} className="bg-zinc-900 text-zinc-200">{g.title}</option>
                            ))}
                        </select>
                    </div>
                    {/* Parent Task Selector */}
                    {localTask.goalId && (
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3 text-zinc-400 text-sm">
                                <ListTree className="h-4 w-4" />
                                <span>Part of Workstream</span>
                            </div>
                            <select 
                                value={localTask.parentTaskId || ""} 
                                onChange={(e) => handleUpdate({ parentTaskId: e.target.value || null })}
                                className="bg-transparent text-right text-sm text-zinc-200 border border-transparent hover:border-zinc-800 focus:border-zinc-700 rounded-md px-2 py-1 outline-none transition-colors max-w-[200px]"
                            >
                                <option value="" className="bg-zinc-900 text-zinc-500">None (Top-level)</option>
                                {allTasks
                                    .filter(t => t.goalId === localTask.goalId && t.id !== localTask.id && !t.parentTaskId)
                                    .map(t => (
                                        <option key={t.id} value={t.id} className="bg-zinc-900 text-zinc-200">{t.title}</option>
                                    ))
                                }
                            </select>
                        </div>
                    )}

                    {/* Do Date */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 text-cyan-500/80 text-sm font-medium">
                            <CalendarIcon className="h-4 w-4" />
                            <span>Do Date (Intention)</span>
                        </div>
                        <input 
                            type="date" 
                            value={localTask.scheduledDate ? new Date(localTask.scheduledDate).toISOString().split('T')[0] : ""}
                            onChange={(e) => handleUpdate({ scheduledDate: e.target.value ? new Date(e.target.value) : null })}
                            className="bg-transparent text-right text-sm text-zinc-200 border border-transparent hover:border-zinc-800 focus:border-cyan-900/50 rounded-md px-2 py-1 outline-none transition-colors font-mono"
                        />
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 text-red-500/80 text-sm font-medium">
                            <CalendarIcon className="h-4 w-4" />
                            <span>Deadline (External)</span>
                        </div>
                        <input 
                            type="date" 
                            value={localTask.dueDate ? new Date(localTask.dueDate).toISOString().split('T')[0] : ""}
                            onChange={(e) => handleUpdate({ dueDate: e.target.value ? new Date(e.target.value) : null })}
                            className="bg-transparent text-right text-sm text-zinc-200 border border-transparent hover:border-zinc-800 focus:border-red-900/50 rounded-md px-2 py-1 outline-none transition-colors font-mono"
                        />
                    </div>

                    {/* Energy Level */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 text-zinc-400 text-sm">
                            <Battery className="h-4 w-4" />
                            <span>Energy Required</span>
                        </div>
                        <select 
                            value={localTask.energyLevel || ""} 
                            onChange={(e) => handleUpdate({ energyLevel: e.target.value || null })}
                            className="bg-transparent text-right text-sm text-zinc-200 border border-transparent hover:border-zinc-800 focus:border-zinc-700 rounded-md px-2 py-1 outline-none transition-colors"
                        >
                            <option value="" className="bg-zinc-900 text-zinc-500">Unspecified</option>
                            <option value="high" className="bg-zinc-900 text-emerald-400">High</option>
                            <option value="medium" className="bg-zinc-900 text-amber-400">Medium</option>
                            <option value="low" className="bg-zinc-900 text-zinc-400">Low</option>
                        </select>
                    </div>

                    {/* Estimate */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 text-zinc-400 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>Estimate (Mins)</span>
                        </div>
                        <input 
                            type="number"
                            min="5"
                            step="5"
                            value={localTask.estimatedMinutes || 30} 
                            onChange={(e) => handleUpdate({ estimatedMinutes: parseInt(e.target.value) || 30 })}
                            className="bg-transparent text-right text-sm text-zinc-200 border border-transparent hover:border-zinc-800 focus:border-zinc-700 rounded-md px-2 py-1 outline-none transition-colors font-mono w-20"
                        />
                    </div>

                    {/* Anticipated Friction */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 text-zinc-400 text-sm">
                            <span className="text-zinc-500 font-mono text-xs font-bold leading-none w-4 text-center">F</span>
                            <span>Anticipated Friction</span>
                        </div>
                        <input 
                            type="text"
                            placeholder="E.g. anxiety, setup time..."
                            value={localTask.anticipatedFriction || ""} 
                            onChange={(e) => handleUpdate({ anticipatedFriction: e.target.value || null })}
                            className="bg-transparent text-right text-sm text-zinc-200 border border-transparent hover:border-zinc-800 focus:border-zinc-700 rounded-md px-2 py-1 outline-none transition-colors max-w-[200px]"
                        />
                    </div>

                    {/* Progress */}
                    <div className="flex items-center justify-between group mt-2 pt-4 border-t border-zinc-800/50">
                        <div className="flex items-center gap-3 text-emerald-500/80 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Time Tracked</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-sm">
                            <span className="text-emerald-400">{Math.round(localTask.spentMinutes || 0)}m</span>
                            <span className="text-zinc-600">/</span>
                            <span className="text-zinc-400">{localTask.estimatedMinutes}m</span>
                        </div>
                    </div>

                    {/* Sub-tasks */}
                    {subTasks.length > 0 && (
                        <div className="mt-2 pt-4 border-t border-zinc-800/50 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-zinc-400 font-medium text-sm">
                                    <ListTree className="w-4 h-4" />
                                    <h3>Micro-Tasks <span className="text-zinc-600 font-normal">({subTasks.filter(s => s.status === 'completed').length}/{subTasks.length})</span></h3>
                                </div>
                                {/* Mini progress bar */}
                                <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full transition-all"
                                        style={{ width: `${Math.round((subTasks.filter(s => s.status === 'completed').length / subTasks.length) * 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {subTasks.map(st => (
                                    <div key={st.id} className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800/80 p-2.5 rounded-lg">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.status === 'completed' ? 'bg-cyan-500' : st.status === 'in-progress' ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                                        <span className={`flex-1 text-xs truncate ${st.status === 'completed' ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>{st.title}</span>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {st.scheduledDate && (
                                                <span className="text-[10px] text-zinc-500 font-mono">{new Date(st.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            )}
                                            <span className="text-[10px] text-zinc-600 font-mono">{st.estimatedMinutes}m</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Breakdown */}
                    <div className="mt-2 pt-4 border-t border-zinc-800/50 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm">
                            <Sparkles className="w-4 h-4" />
                            <h3>AI Task Breakdown</h3>
                        </div>
                        <p className="text-xs text-zinc-500">Break this monolithic task into daily actionable micro-tasks.</p>
                        
                        <div className="flex flex-col gap-2 mt-2">
                            <input 
                                type="text"
                                placeholder="E.g. 5 questions per day"
                                value={breakdownGuidance}
                                onChange={(e) => setBreakdownGuidance(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500/50 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
                            />
                            
                            {/* Prompt Hints */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                <button onClick={() => setBreakdownGuidance("1 chapter per day")} className="text-[10px] bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700/50 transition-colors">1 chapter/day</button>
                                <button onClick={() => setBreakdownGuidance("Divide evenly across days until deadline")} className="text-[10px] bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700/50 transition-colors">Evenly until deadline</button>
                                <button onClick={() => setBreakdownGuidance("5 questions per day")} className="text-[10px] bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700/50 transition-colors">5 questions/day</button>
                            </div>

                            <button 
                                onClick={handleBreakdown}
                                disabled={isBreakingDown || !breakdownGuidance}
                                className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isBreakingDown ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Generate Micro-tasks
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    )
}
