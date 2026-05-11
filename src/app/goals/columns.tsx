"use client"

import { ColumnDef } from "@tanstack/react-table";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  SignalHigh, 
  SignalMedium, 
  SignalLow, 
  Circle, 
  CheckCircle2, 
  Clock,
  PlayCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { updateTaskStatus, updateTaskPriority, completeTaskManually, deleteTaskAction } from "@/app/actions";
import ManualCompletionModal from "@/components/ManualCompletionModal";
import { useState, useTransition } from "react";

const StatusCell = ({ row }: { row: any }) => {
  const [completionPrompt, setCompletionPrompt] = useState<{id: string, title: string, estimatedMinutes: number} | null>(null);
  const [isPending, startTransition] = useTransition();
  const task = row.original;
  const status = task.status;
  const isCompleted = status === 'completed';

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'completed') {
      setCompletionPrompt({
        id: task.id,
        title: task.title || "Task",
        estimatedMinutes: task.estimatedMinutes || 30
      });
    } else {
      updateTaskStatus(task.id, newStatus);
    }
  };

  const handleManualCompletion = (spentMinutes: number, notes: string) => {
    startTransition(async () => {
      await completeTaskManually(task.id, spentMinutes, notes);
    });
  };

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:bg-zinc-900/50 p-1.5 -ml-1.5 rounded-md transition-colors cursor-pointer focus:outline-none"
          >
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-cyan-500" />
            ) : status === 'in-progress' ? (
              <PlayCircle className="h-4 w-4 text-amber-500" />
            ) : status === 'blocked' ? (
              <Clock className="h-4 w-4 text-rose-400" />
            ) : (
              <Circle className="h-4 w-4 text-zinc-600" />
            )}
            <span className={`capitalize text-sm ${isCompleted ? 'text-zinc-500 line-through' : status === 'blocked' ? 'text-rose-400' : 'text-zinc-300'}`}>
              {status}
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-zinc-950 border-zinc-800 text-zinc-300">
          <DropdownMenuItem onClick={() => handleStatusChange('pending')} className="cursor-pointer focus:bg-zinc-900 focus:text-zinc-100">
            <Circle className="h-4 w-4 mr-2 text-zinc-500" /> Pending
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('in-progress')} className="cursor-pointer focus:bg-zinc-900 focus:text-amber-400">
            <PlayCircle className="h-4 w-4 mr-2 text-amber-500" /> In Progress
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('blocked')} className="cursor-pointer focus:bg-zinc-900 focus:text-rose-400">
            <Clock className="h-4 w-4 mr-2 text-rose-400" /> Blocked
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('skipped')} className="cursor-pointer focus:bg-zinc-900 focus:text-zinc-500">
            <Circle className="h-4 w-4 mr-2 text-zinc-500" /> Skipped
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('completed')} className="cursor-pointer focus:bg-zinc-900 focus:text-cyan-400">
            <CheckCircle2 className="h-4 w-4 mr-2 text-cyan-500" /> Completed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export const columns: ColumnDef<Task>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="hover:bg-transparent px-0 hover:text-cyan-500 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Task Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-zinc-100">{row.original.title}</span>
          {row.original.parentTaskTitle && (
            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded w-fit inline-flex">
              ↳ {row.original.parentTaskTitle}
            </span>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="hover:bg-transparent px-0 hover:text-cyan-500 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <StatusCell row={row} />
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="hover:bg-transparent px-0 hover:text-cyan-500 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.original.dueDate ? new Date(row.original.dueDate) : null;
      if (!date) return <span className="text-zinc-600 text-sm italic">No date</span>;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = date < today;
      const isToday = date.toDateString() === today.toDateString();
      
      return (
        <span className={`text-sm font-medium ${isOverdue ? 'text-red-500' : isToday ? 'text-cyan-500' : 'text-zinc-400'}`}>
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )
    }
  },
  {
    accessorKey: "priority",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="hover:bg-transparent px-0 hover:text-cyan-500 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Priority
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const priority = row.original.priority;
      const taskId = row.original.id;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 hover:bg-zinc-900/50 p-1.5 -ml-1.5 rounded-md transition-colors cursor-pointer focus:outline-none"
            >
              {priority === 'high' && <SignalHigh className="h-4 w-4 text-red-500" />}
              {priority === 'medium' && <SignalMedium className="h-4 w-4 text-yellow-500" />}
              {priority === 'low' && <SignalLow className="h-4 w-4 text-zinc-500" />}
              <span className="capitalize text-zinc-400 text-sm">{priority}</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-zinc-950 border-zinc-800 text-zinc-300">
            <DropdownMenuItem onClick={() => updateTaskPriority(taskId, 'low')} className="cursor-pointer focus:bg-zinc-900 focus:text-zinc-100">
              <SignalLow className="h-4 w-4 mr-2 text-zinc-500" /> Low
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateTaskPriority(taskId, 'medium')} className="cursor-pointer focus:bg-zinc-900 focus:text-yellow-400">
              <SignalMedium className="h-4 w-4 mr-2 text-yellow-500" /> Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateTaskPriority(taskId, 'high')} className="cursor-pointer focus:bg-zinc-900 focus:text-red-400">
              <SignalHigh className="h-4 w-4 mr-2 text-red-500" /> High
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
  {
    id: "execution",
    header: "Execution",
    cell: ({ row }) => {
      const task = row.original as any;
      const spent = Math.round(task.spentMinutes || 0); 
      const est = task.estimatedMinutes || 30;
      const percent = Math.min((spent / est) * 100, 100);
      
      return (
        <div className="flex items-center gap-3 w-32">
          <Clock className="h-3 w-3 text-zinc-600" />
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-xs text-zinc-500 w-12 text-right">{spent}/{est}m</span>
        </div>
      )
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const task = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0 hover:bg-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-300">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              className="focus:bg-zinc-900 focus:text-zinc-100 cursor-pointer"
              onClick={() => navigator.clipboard.writeText(task.id)}
            >
              Copy task ID
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem 
              onClick={() => deleteTaskAction(task.id)}
              className="text-red-500 font-semibold focus:bg-zinc-900 focus:text-red-400 cursor-pointer"
            >
              Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }
]
