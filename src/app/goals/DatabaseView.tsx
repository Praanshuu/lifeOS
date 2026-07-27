"use client"

import { useState, useMemo, useEffect } from "react"
import { Task } from "@/types"
import { columns } from "./columns"
import { DataTable } from "@/components/ui/data-table"
import KanbanBoard from "./KanbanBoard"
import GoalsRollup from "./GoalsRollup"
import TaskInspector from "./TaskInspector"
import { CreateTaskModal } from "@/components/CreateTaskModal"
import { getTasks, getGoals } from "@/app/actions"
import { LayoutList, KanbanSquare, Target, Search, FilterX, ChevronRight, Plus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DatabaseView({ initialTasks, initialGoals }: { initialTasks: Task[], initialGoals: any[] }) {
    const [activeView, setActiveView] = useState<'table' | 'board' | 'goals'>('table')
    const [searchQuery, setSearchQuery] = useState("")
    const [priorityFilter, setPriorityFilter] = useState<string | 'all'>('all')
    const [goalFilter, setGoalFilter] = useState<string | 'all'>('all')
    const [statusFilter, setStatusFilter] = useState<string | 'all'>('all')
    const [inspectorTask, setInspectorTask] = useState<Task | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [goals, setGoals] = useState<any[]>(initialGoals)
    const router = useRouter()

    // Sync state with props when server-side data changes
    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    useEffect(() => {
        setGoals(initialGoals)
    }, [initialGoals])

    const refreshData = async () => {
        // Run all queries in parallel to significantly reduce latency
        const [updatedTasks, updatedGoals] = await Promise.all([
            getTasks(),
            getGoals()
        ]);
        
        setTasks(updatedTasks as Task[]);
        setGoals(updatedGoals as any[]);
    }

    // Hierarchical enrichment
    const enrichedTasks = useMemo(() => {
        const taskMap = new Map(tasks.map(t => [t.id, { ...t }]));
        const childrenMap = new Map<string, string[]>();
        
        tasks.forEach(t => {
            if (t.parentTaskId) {
                if (!childrenMap.has(t.parentTaskId)) childrenMap.set(t.parentTaskId, []);
                childrenMap.get(t.parentTaskId)!.push(t.id);
            }
        });

        const computed = new Set<string>();
        function compute(id: string) {
            if (computed.has(id)) return taskMap.get(id)!;
            const task = taskMap.get(id)!;
            let totalSpent = task.spentMinutes || 0;
            
            const children = childrenMap.get(id) || [];
            for (const childId of children) {
                const child = compute(childId);
                totalSpent += child.spentMinutes || 0;
            }
            
            task.spentMinutes = totalSpent;
            // For estimated minutes, we use the max of (own estimate) or (sum of children estimates)
            // to ensure the bar looks realistic if children estimates exceed the parent's.
            let childrenEst = 0;
            for (const childId of children) {
                childrenEst += taskMap.get(childId)!.estimatedMinutes || 0;
            }
            if (childrenEst > (task.estimatedMinutes || 0)) {
                task.estimatedMinutes = childrenEst;
            }

            computed.add(id);
            return task;
        }

        initialTasks.forEach(t => compute(t.id));
        return Array.from(taskMap.values());
    }, [initialTasks]);

    const filteredTasks = enrichedTasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = priorityFilter === 'all' ? true : task.priority === priorityFilter;
        const matchesGoal = goalFilter === 'all' ? true : task.goalId === goalFilter;
        const matchesStatus = statusFilter === 'all' ? true : task.status === statusFilter;
        return matchesSearch && matchesPriority && matchesGoal && matchesStatus;
    }).sort((a, b) => {
        // Move completed/skipped to bottom
        const aDone = a.status === 'completed' || a.status === 'skipped';
        const bDone = b.status === 'completed' || b.status === 'skipped';
        if (aDone && !bDone) return 1;
        if (!aDone && bDone) return -1;
        
        // If both are active, sort by priority
        if (!aDone) {
            const weights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
            return (weights[b.priority] || 0) - (weights[a.priority] || 0);
        }
        return 0;
    });

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Header with Add Task */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-zinc-100">Database</h1>
                    <p className="text-zinc-500 text-sm">Manage tasks, goals, and execution metrics.</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-cyan-950 text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/10"
                >
                    <Plus className="h-4 w-4 stroke-[3px]" /> Add Task
                </button>
            </header>

            {/* View Controller & Filter Engine */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                {/* View Toggles */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setActiveView('table')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'table' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                    >
                        <LayoutList className="h-4 w-4" />
                        Table
                    </button>
                    <button 
                        onClick={() => setActiveView('board')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'board' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                    >
                        <KanbanSquare className="h-4 w-4" />
                        Board
                    </button>
                    <button 
                        onClick={() => setActiveView('goals')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'goals' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                    >
                        <Target className="h-4 w-4" />
                        Objectives
                    </button>
                </div>

                {/* Filter Engine */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <input 
                            type="text" 
                            placeholder="Search tasks..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded-md pl-9 pr-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all w-[200px]"
                        />
                    </div>
                    
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 appearance-none cursor-pointer min-w-[110px]"
                    >
                        <option value="all">Any Status</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="skipped">Skipped</option>
                    </select>

                    <select 
                        value={goalFilter}
                        onChange={(e) => setGoalFilter(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 appearance-none cursor-pointer max-w-[150px]"
                    >
                        <option value="all">All Objectives</option>
                        {initialGoals.map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                    </select>

                    <select 
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 appearance-none cursor-pointer"
                    >
                        <option value="all">All Priorities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                    </select>

                    {(searchQuery || priorityFilter !== 'all' || goalFilter !== 'all' || statusFilter !== 'all') && (
                        <button 
                            onClick={() => { 
                                setSearchQuery(""); 
                                setPriorityFilter("all");
                                setGoalFilter("all");
                                setStatusFilter("all");
                            }}
                            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-md transition-colors"
                            title="Clear filters"
                        >
                            <FilterX className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            <CreateTaskModal 
                isOpen={isCreateModalOpen}
                onClose={() => { setIsCreateModalOpen(false); refreshData(); }} 
                goals={initialGoals}
            />

            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeView === 'table' ? (
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                <LayoutList className="w-3 h-3" />
                                Active Inventory ({filteredTasks.filter(t => t.status !== 'completed' && t.status !== 'skipped').length})
                            </h3>
                            <DataTable 
                                columns={columns} 
                                data={filteredTasks.filter(t => t.status !== 'completed' && t.status !== 'skipped')} 
                                onRowClick={setInspectorTask} 
                            />
                        </div>

                        {filteredTasks.some(t => t.status === 'completed' || t.status === 'skipped') && (
                            <div className="pt-6 border-t border-zinc-900">
                                <details className="group/archive">
                                    <summary className="flex items-center gap-2 cursor-pointer list-none text-xs font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors px-1">
                                        <ChevronRight className="w-4 h-4 group-open/archive:rotate-90 transition-transform" />
                                        Task Archive ({filteredTasks.filter(t => t.status === 'completed' || t.status === 'skipped').length})
                                    </summary>
                                    <div className="mt-4 opacity-50 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                                        <DataTable 
                                            columns={columns} 
                                            data={filteredTasks.filter(t => t.status === 'completed' || t.status === 'skipped')} 
                                            onRowClick={setInspectorTask} 
                                        />
                                    </div>
                                </details>
                            </div>
                        )}
                    </div>
                ) : activeView === 'board' ? (
                    <KanbanBoard tasks={filteredTasks} onTaskClick={setInspectorTask} />
                ) : (
                    <GoalsRollup tasks={tasks} goals={initialGoals} />
                )}
            </div>

            {/* Global Inspector Modal */}
            {inspectorTask && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={() => setInspectorTask(null)} />
                    <TaskInspector 
                        task={inspectorTask} 
                        goals={initialGoals} 
                        allTasks={tasks}
                        onClose={() => { setInspectorTask(null); refreshData(); }} 
                    />
                </>
            )}
        </div>
    )
}
