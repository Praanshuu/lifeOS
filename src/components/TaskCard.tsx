import { Task } from "@/types";
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { PlayCircle, StopCircle, Trash2, Clock, Edit2 } from "lucide-react";

export function TaskCard({ task, onDelete, onToggle, activeTaskId, onToggleSession, onEdit, isUpNext }: { task: Task, onDelete: (id: string) => void, onToggle: (task: Task) => void, activeTaskId: string | null, onToggleSession: (taskId: string) => void, onEdit?: (task: Task) => void, isUpNext?: boolean }) {
    const isActive = activeTaskId === task.id;
    
    const spent = Math.round(task.spentMinutes || 0); 
    const est = task.estimatedMinutes || 30;
    const percent = Math.min((spent / est) * 100, 100);

    return (
        <div
            className={`p-4 border rounded-xl bg-zinc-950 flex flex-col gap-4 transition-all group relative
      ${isActive ? "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50" : isUpNext ? "border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.1)] ring-1 ring-yellow-500/30" : "border-zinc-800 hover:border-zinc-700"}
    `}
        >
            {isUpNext && !isActive && (
                <div className="absolute -top-2.5 right-4 bg-zinc-950 border border-yellow-500/50 text-yellow-500 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full z-10 flex items-center gap-1 shadow-sm">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500"></span>
                    </span>
                    Up Next
                </div>
            )}
            <div className="flex justify-between items-start gap-4">
                {/* LEFT */}
                <div className="flex gap-3">
                    <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => onToggle(task)}
                        className="mt-1 border-zinc-700 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                    />
                    <div>
                        <h3 className={`font-medium text-sm leading-snug transition-colors ${task.status === 'completed' ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
                            {task.title}
                        </h3>
                        
                        <div className="flex items-center gap-3 mt-2">
                            {task.category && task.category !== 'work' && (
                                <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    task.category === 'break' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    task.category === 'distraction' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}>
                                    {task.category}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                <Clock className="h-3 w-3" />
                                {spent}/{est}m
                            </div>
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10"
                            onClick={() => onEdit(task)}
                        >
                            <Edit2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => onDelete(task.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* PROGRESS & PLAY */}
            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                <div className="flex-1 max-w-[200px]">
                    <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div className={`h-full transition-all ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`} style={{ width: `${percent}%` }} />
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-3 text-xs font-medium border transition-colors ${isActive ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:text-red-300" : "bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/20 hover:text-cyan-400"}`}
                    onClick={() => onToggleSession(task.id)}
                >
                    {isActive ? (
                        <><StopCircle className="h-3.5 w-3.5 mr-1.5" /> Stop Focus</>
                    ) : (
                        <><PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Start Focus</>
                    )}
                </Button>
            </div>
        </div>
    )
}