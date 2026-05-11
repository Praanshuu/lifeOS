"use client"

import { useState, useMemo } from "react"
import { Task } from "@/types"
import { columns } from "./columns"
import { DataTable } from "@/components/ui/data-table"
import KanbanBoard from "./KanbanBoard"
import GoalsRollup from "./GoalsRollup"
import TaskInspector from "./TaskInspector"
import { LayoutList, KanbanSquare, Target, Search, FilterX } from "lucide-react"

export default function DatabaseView({ initialTasks, initialGoals }: { initialTasks: Task[], initialGoals: any[] }) {
    const [activeView, setActiveView] = useState<'table' | 'board' | 'goals'>('table')
    const [searchQuery, setSearchQuery] = useState("")
    const [priorityFilter, setPriorityFilter] = useState<string | 'all'>('all')
    const [goalFilter, setGoalFilter] = useState<string | 'all'>('all')
    const [statusFilter, setStatusFilter] = useState<string | 'all'>('all')
    const [inspectorTask, setInspectorTask] = useState<Task | null>(null)

    // Hierarchical enrichment
    const enrichedTasks = useMemo(() => {
        const taskMap = new Map(initialTasks.map(t => [t.id, { ...t }]));
        const childrenMap = new Map<string, string[]>();
        
        initialTasks.forEach(t => {
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
    });

    return (
        <div className="flex flex-col gap-6 w-full">
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

            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeView === 'table' ? (
                    <DataTable columns={columns} data={filteredTasks} onRowClick={setInspectorTask} />
                ) : activeView === 'board' ? (
                    <KanbanBoard tasks={filteredTasks} onTaskClick={setInspectorTask} />
                ) : (
                    <GoalsRollup tasks={enrichedTasks} goals={initialGoals} />
                )}
            </div>

            {/* Global Inspector Modal */}
            {inspectorTask && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={() => setInspectorTask(null)} />
                    <TaskInspector 
                        task={inspectorTask} 
                        goals={initialGoals} 
                        allTasks={enrichedTasks}
                        onClose={() => setInspectorTask(null)} 
                    />
                </>
            )}
        </div>
    )
}
