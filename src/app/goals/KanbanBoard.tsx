"use client"

import { Task } from "@/types"
import { PlayCircle, CheckCircle2, SignalHigh, SignalMedium, SignalLow, Clock, ListTodo, Zap } from "lucide-react"

export default function KanbanBoard({ 
    tasks,
    onTaskClick 
}: { 
    tasks: Task[],
    onTaskClick?: (task: Task) => void
}) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // The Psychology of Execution Flow
    const inProgress = tasks.filter(t => t.status === 'in-progress')
    const completed = tasks.filter(t => t.status === 'completed')
    
    const upNext = tasks.filter(t => 
        t.status === 'pending' && 
        t.scheduledDate && 
        new Date(t.scheduledDate) <= today
    )
    
    const backlog = tasks.filter(t => 
        t.status === 'pending' && 
        (!t.scheduledDate || new Date(t.scheduledDate) > today)
    )

    const KanbanColumn = ({ title, icon: Icon, tasksData, colorClass }: { title: string, icon: any, tasksData: Task[], colorClass: string }) => (
        <div className="flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden h-[600px] shadow-sm">
            <div className={`flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-900/20 ${colorClass}`}>
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <h3 className="font-semibold text-sm tracking-wide uppercase">{title}</h3>
                </div>
                <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
                    {tasksData.length}
                </span>
            </div>
            
            <div className="p-3 flex flex-col gap-3 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-zinc-800">
                {tasksData.map(task => (
                    <div 
                        key={task.id} 
                        onClick={() => onTaskClick && onTaskClick(task)}
                        className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-colors p-4 rounded-lg flex flex-col gap-4 cursor-pointer shadow-sm hover:shadow-md group"
                    >
                        <div className="flex flex-col gap-1.5">
                            <span className="font-medium text-zinc-200 text-sm leading-snug group-hover:text-cyan-400 transition-colors">
                                {task.title}
                            </span>
                            {task.parentTaskTitle && (
                                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded w-fit">
                                    ↳ {task.parentTaskTitle}
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                            <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800/50">
                                {task.priority === 'high' && <SignalHigh className="h-3 w-3 text-red-500" />}
                                {task.priority === 'medium' && <SignalMedium className="h-3 w-3 text-amber-500" />}
                                {task.priority === 'low' && <SignalLow className="h-3 w-3 text-zinc-500" />}
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800/50">
                                <Clock className="h-3 w-3 text-zinc-500" />
                                {task.estimatedMinutes}m
                            </div>
                        </div>
                    </div>
                ))}
                
                {tasksData.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-sm italic">
                        Empty
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <KanbanColumn title="Backlog" icon={ListTodo} tasksData={backlog} colorClass="text-zinc-500" />
            <KanbanColumn title="Up Next" icon={Zap} tasksData={upNext} colorClass="text-cyan-500" />
            <KanbanColumn title="In Progress" icon={PlayCircle} tasksData={inProgress} colorClass="text-amber-500" />
            <KanbanColumn title="Done" icon={CheckCircle2} tasksData={completed} colorClass="text-emerald-500" />
        </div>
    )
}
