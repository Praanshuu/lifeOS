"use client"

import { Task } from "@/types"
import { Target, ChevronDown, ChevronRight, PlusCircle, ListTree, CheckCircle2 } from "lucide-react"
import { useState, useTransition } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { createGoal, updateGoalDetails } from "@/app/actions"

export default function GoalsRollup({ tasks, goals }: { tasks: Task[], goals: any[] }) {
    const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({})
    const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({})
    const [newGoalTitle, setNewGoalTitle] = useState("")
    const [newGoalImportance, setNewGoalImportance] = useState<number>(1)
    const [newGoalLogical, setNewGoalLogical] = useState("")
    const [newGoalEmotional, setNewGoalEmotional] = useState("")
    const [isCreatingFormOpen, setIsCreatingFormOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Calculate slots
    const limits: Record<number, number> = { 5: 2, 4: 4, 3: 6, 2: Infinity, 1: Infinity }
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    goals.forEach(g => {
        if (g.status === 'active' && g.importance) {
            counts[g.importance as keyof typeof counts]++
        }
    })

    const toggleGoal = (id: string) => {
        setExpandedGoals(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const toggleParent = (id: string) => {
        setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newGoalTitle || !newGoalTitle.trim()) return;
        
        const title = newGoalTitle;
        const importance = newGoalImportance;
        const logical = newGoalLogical;
        const emotional = newGoalEmotional;
        
        setIsSubmitting(true);
        try {
            await createGoal(title, importance, logical || undefined, emotional || undefined);
            setNewGoalTitle("");
            setNewGoalLogical("");
            setNewGoalEmotional("");
            setNewGoalImportance(1);
            setIsCreatingFormOpen(false);
        } catch (error) {
            console.error("Failed to create goal", error);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await updateGoalDetails(id, { status });
        } catch (error) {
            console.error("Failed to update goal status", error);
        }
    }

    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Create Goal Input */}
            {!isCreatingFormOpen ? (
                <button 
                    onClick={() => setIsCreatingFormOpen(true)}
                    className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-sm hover:border-cyan-500/50 hover:bg-zinc-900/50 transition-colors text-left w-full"
                >
                    <PlusCircle className="h-5 w-5 text-zinc-500" />
                    <span className="flex-1 text-zinc-500 text-sm font-medium">Create a new High-Level Goal...</span>
                </button>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-zinc-950 border border-cyan-500/30 p-4 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                        <Target className="h-5 w-5 text-cyan-500" />
                        <input 
                            name="title"
                            type="text"
                            placeholder="Goal Title (e.g. Pass Semester, Launch App)"
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            className="flex-1 bg-transparent border-none text-zinc-100 text-lg focus:outline-none placeholder:text-zinc-600 font-semibold"
                            autoFocus
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Importance & Slots</label>
                            <select 
                                value={newGoalImportance}
                                onChange={(e) => setNewGoalImportance(Number(e.target.value))}
                                className="bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                            >
                                {[5, 4, 3, 2, 1].map(lvl => {
                                    const available = limits[lvl] - counts[lvl as keyof typeof counts];
                                    const isFull = available <= 0 && lvl > 2;
                                    return (
                                        <option key={lvl} value={lvl} disabled={isFull}>
                                            Level {lvl} {lvl > 2 ? `(${available} slots left)` : '(Unlimited)'}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Logical Reason</label>
                            <input 
                                type="text"
                                maxLength={100}
                                placeholder="Why does this objectively matter?"
                                value={newGoalLogical}
                                onChange={(e) => setNewGoalLogical(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50 placeholder:text-zinc-600"
                            />
                            <span className="text-[10px] text-zinc-500 text-right">{newGoalLogical.length}/100</span>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Emotional Reason</label>
                            <textarea 
                                maxLength={150}
                                placeholder="How will achieving this make you feel? (AI uses this to coach you)"
                                value={newGoalEmotional}
                                onChange={(e) => setNewGoalEmotional(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50 placeholder:text-zinc-600 resize-none h-16"
                            />
                            <span className="text-[10px] text-zinc-500 text-right">{newGoalEmotional.length}/150</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-2">
                        <button 
                            type="button"
                            onClick={() => setIsCreatingFormOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting || !newGoalTitle.trim()}
                            className="bg-cyan-500 text-cyan-950 hover:bg-cyan-400 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Creating..." : "Save Goal"}
                        </button>
                    </div>
                </form>
            )}

            {/* Goals List */}
            {goals.filter(g => g.status === 'active').map(goal => {
                // All tasks belonging to this goal
                const goalTasks = tasks.filter(t => t.goalId === goal.id);
                
                // Build parent ID set for this goal
                const goalParentIds = new Set(goalTasks.filter(t => t.parentTaskId).map(t => t.parentTaskId!));

                // For progress: count only leaf tasks (standalone + micro-tasks)
                const leafTasks = goalTasks.filter(t => !goalParentIds.has(t.id));
                const completedLeafs = leafTasks.filter(t => t.status === 'completed').length;
                const totalLeafs = leafTasks.length;
                
                const totalSpent = Math.round(leafTasks.reduce((acc, t) => acc + (t.spentMinutes || 0), 0));
                const totalEst = leafTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
                const progress = totalEst > 0 ? Math.min(Math.round((totalSpent / totalEst) * 100), 100) : 0;
                const isExpanded = expandedGoals[goal.id]

                // RECURSIVE RENDERER FOR TASKS
                const renderTask = (t: Task, depth: number = 0) => {
                    const children = goalTasks
                        .filter(child => child.parentTaskId === t.id)
                        .sort((a, b) => {
                            const aDone = a.status === 'completed' || a.status === 'skipped';
                            const bDone = b.status === 'completed' || b.status === 'skipped';
                            if (aDone && !bDone) return 1;
                            if (!aDone && bDone) return -1;
                            
                            if (!aDone) {
                                const weights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
                                return (weights[b.priority] || 0) - (weights[a.priority] || 0);
                            }
                            return 0;
                        });
                    const isParent = children.length > 0;
                    const isExpanded = expandedParents[t.id] ?? true;
                    
                    const childSpent = Math.round(children.reduce((acc, c) => acc + (c.spentMinutes || 0), 0));
                    const childEst = children.reduce((acc, c) => acc + (c.estimatedMinutes || 30), 0);
                    const progress = childEst > 0 ? Math.min(Math.round((childSpent / childEst) * 100), 100) : 0;

                    if (isParent) {
                        return (
                            <div key={t.id} className={`flex flex-col border border-zinc-800/80 rounded-xl overflow-hidden ${depth > 0 ? 'ml-4 mt-2' : ''}`}>
                                <div 
                                    onClick={(e) => { e.stopPropagation(); toggleParent(t.id); }}
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/30 transition-colors bg-zinc-900/40"
                                >
                                    <div className="flex items-center gap-2">
                                        <ListTree className={`w-4 h-4 ${depth > 0 ? 'text-indigo-400/50' : 'text-indigo-400'}`} />
                                        <span className="text-sm font-medium text-zinc-200">{t.title}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                                            {children.length} {depth > 0 ? 'sub-tasks' : 'micro-tasks'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-zinc-500 font-mono">{childSpent}/{childEst}m</span>
                                        <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="flex flex-col divide-y divide-zinc-800/30">
                                        {children.map(child => renderTask(child, depth + 1))}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div key={t.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900/30 transition-colors ${depth > 0 ? 'ml-4' : ''}`}>
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${t.status === 'completed' ? 'text-cyan-500' : 'text-zinc-700'}`} />
                            <span className={`flex-1 text-xs ${t.status === 'completed' ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>{t.title}</span>
                            <div className="flex items-center gap-2 shrink-0">
                                {t.scheduledDate && (
                                    <span className="text-[10px] text-zinc-600 font-mono">{new Date(t.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                )}
                                <span className="text-[10px] text-zinc-600 font-mono">{t.estimatedMinutes}m</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    t.status === 'completed' ? 'text-cyan-500 bg-cyan-500/10' : 
                                    t.status === 'in-progress' ? 'text-amber-400 bg-amber-500/10' : 
                                    'text-zinc-600 bg-zinc-800/50'
                                }`}>{t.status}</span>
                            </div>
                        </div>
                    );
                };

                // Top-level Workstreams: are parents AND don't have a parent themselves
                const topLevelParents = goalTasks
                    .filter(t => goalParentIds.has(t.id) && !t.parentTaskId)
                    .sort((a, b) => {
                        const aDone = a.status === 'completed' || a.status === 'skipped';
                        const bDone = b.status === 'completed' || b.status === 'skipped';
                        if (aDone && !bDone) return 1;
                        if (!aDone && bDone) return -1;
                        return 0;
                    });
                    
                const standaloneTasks = goalTasks
                    .filter(t => !goalParentIds.has(t.id) && !t.parentTaskId)
                    .sort((a, b) => {
                        const aDone = a.status === 'completed' || a.status === 'skipped';
                        const bDone = b.status === 'completed' || b.status === 'skipped';
                        if (aDone && !bDone) return 1;
                        if (!aDone && bDone) return -1;
                        return 0;
                    });

                return (
                    <div key={goal.id} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden transition-all shadow-sm group">
                        {/* Goal Header */}
                        <div 
                            onClick={() => toggleGoal(goal.id)}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-900/40 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronDown className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" /> : <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />}
                                <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                    <Target className="h-4 w-4 text-cyan-500" />
                                </div>
                                <h2 className="text-lg font-semibold text-zinc-100">{goal.title}</h2>
                                {goal.importance && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-zinc-800 text-zinc-400 border border-zinc-700">
                                        LVL {goal.importance}
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-sm font-mono text-zinc-500">{totalSpent}/{totalEst}m</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                                            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                        <span className="text-[10px] font-medium text-cyan-500 w-8 text-right">{progress}%</span>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Mark this goal as achieved? This will free up its importance slot.")) {
                                            handleStatusChange(goal.id, 'achieved');
                                        }
                                    }}
                                    className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group/btn"
                                    title="Mark as Achieved"
                                >
                                    <CheckCircle2 className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Goal Tasks Rollup */}
                        {isExpanded && (
                            <div className="border-t border-zinc-800 bg-zinc-900/20 p-4 flex flex-col gap-4">
                                {goalTasks.length === 0 ? (
                                    <div className="text-center p-8 text-zinc-500 text-sm italic border border-dashed border-zinc-800/50 rounded-lg">
                                        No tasks assigned to this goal yet.
                                    </div>
                                ) : (
                                    <>
                                        {/* Separated Task Sections */}
                                        <div className="flex flex-col gap-6">
                                            {/* Active Section */}
                                            {(topLevelParents.some(t => t.status !== 'completed' && t.status !== 'skipped') || standaloneTasks.some(t => t.status !== 'completed' && t.status !== 'skipped')) ? (
                                                <div className="flex flex-col gap-4">
                                                    {topLevelParents
                                                        .filter(t => t.status !== 'completed' && t.status !== 'skipped')
                                                        .map(parent => renderTask(parent))}
                                                    
                                                    {standaloneTasks.filter(t => t.status !== 'completed' && t.status !== 'skipped').length > 0 && (
                                                        <div className="flex flex-col gap-2">
                                                            {topLevelParents.some(t => t.status !== 'completed' && t.status !== 'skipped') && (
                                                                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Loose Tasks</p>
                                                            )}
                                                            <div className="bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden">
                                                                {standaloneTasks
                                                                    .filter(t => t.status !== 'completed' && t.status !== 'skipped')
                                                                    .map(task => renderTask(task))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 px-4 bg-emerald-500/5 border border-dashed border-emerald-500/20 rounded-xl">
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-500/40 mx-auto mb-2" />
                                                    <p className="text-xs text-emerald-500/60 font-medium italic">No active tasks. Goal on track.</p>
                                                </div>
                                            )}

                                            {/* Completed Section */}
                                            {(topLevelParents.some(t => t.status === 'completed' || t.status === 'skipped') || standaloneTasks.some(t => t.status === 'completed' || t.status === 'skipped')) && (
                                                <div className="pt-4 border-t border-zinc-800/50">
                                                    <details className="group/completed">
                                                        <summary className="flex items-center gap-2 cursor-pointer list-none text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors">
                                                            <ChevronRight className="w-3 h-3 group-open/completed:rotate-90 transition-transform" />
                                                            Completed Items ({
                                                                goalTasks.filter(t => t.status === 'completed' || t.status === 'skipped').length
                                                            })
                                                        </summary>
                                                        <div className="flex flex-col gap-2 mt-4 opacity-60 grayscale-[0.3]">
                                                            {topLevelParents
                                                                .filter(t => t.status === 'completed' || t.status === 'skipped')
                                                                .map(parent => renderTask(parent))}
                                                            
                                                            {standaloneTasks.filter(t => t.status === 'completed' || t.status === 'skipped').length > 0 && (
                                                                <div className="flex flex-col gap-1">
                                                                    {standaloneTasks
                                                                        .filter(t => t.status === 'completed' || t.status === 'skipped')
                                                                        .map(task => renderTask(task))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Achieved Goals Section (Optional) */}
            {goals.some(g => g.status === 'achieved') && (
                <div className="mt-8 border-t border-zinc-900 pt-8">
                    <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-4 px-2">Achieved Goals</h3>
                    <div className="flex flex-col gap-3 opacity-60">
                        {goals.filter(g => g.status === 'achieved').map(goal => (
                            <div key={goal.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <span className="text-zinc-300 font-medium">{goal.title}</span>
                                </div>
                                <button
                                    onClick={() => handleStatusChange(goal.id, 'active')}
                                    className="text-[10px] text-zinc-500 hover:text-cyan-500 font-bold uppercase tracking-wider"
                                >
                                    Re-activate
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {goals.length === 0 && (
                <div className="text-center p-12 text-zinc-500 italic border border-dashed border-zinc-800 rounded-xl">
                    You have no high-level goals. Create one above to start organizing your life.
                </div>
            )}
        </div>
    )
}
