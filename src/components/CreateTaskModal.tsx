"use client";

import { useState } from "react";
import { createTask } from "@/app/actions";
import { X, Target, Clock, Zap, AlertTriangle, Calendar } from "lucide-react";

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    goals: { id: string; title: string }[];
}

export function CreateTaskModal({ isOpen, onClose, goals }: CreateTaskModalProps) {
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState("medium");
    const [goalId, setGoalId] = useState("");
    const [estimatedMinutes, setEstimatedMinutes] = useState("30");
    const [energyLevel, setEnergyLevel] = useState("medium");
    const [type, setType] = useState("one-off");
    const [dueDate, setDueDate] = useState("");
    const [recurrenceRule, setRecurrenceRule] = useState("daily");
    const [anticipatedFriction, setAnticipatedFriction] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            await createTask(
                title,
                goalId === "none" ? null : goalId,
                new Date(), // Scheduled for today automatically
                priority,
                type,
                parseInt(estimatedMinutes) || 30,
                energyLevel,
                anticipatedFriction || undefined,
                dueDate ? new Date(dueDate) : null,
                type === "recurring" ? recurrenceRule : null
            );
            
            // Reset and close
            setTitle("");
            setPriority("medium");
            setGoalId("");
            setEstimatedMinutes("30");
            setEnergyLevel("medium");
            setType("one-off");
            setDueDate("");
            setRecurrenceRule("daily");
            setAnticipatedFriction("");
            onClose();
        } catch (error) {
            console.error("Failed to create task", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0a0a0b] border border-white/5 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/20">
                    <h2 className="text-lg font-semibold text-zinc-200">New Task</h2>
                    <button 
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-800/50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    {/* Title */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Task Title</label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        {/* Priority */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" /> Priority
                            </label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value)}
                                className="bg-zinc-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 appearance-none"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>

                        {/* Energy Level */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5" /> Energy Req.
                            </label>
                            <select
                                value={energyLevel}
                                onChange={e => setEnergyLevel(e.target.value)}
                                className="bg-zinc-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 appearance-none"
                            >
                                <option value="low">Low (Routine/Easy)</option>
                                <option value="medium">Medium (Standard)</option>
                                <option value="high">High (Deep Work)</option>
                            </select>
                        </div>

                        {/* Estimate */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Est. Minutes
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={estimatedMinutes}
                                    onChange={e => setEstimatedMinutes(e.target.value)}
                                    min="1"
                                    step="5"
                                    className="bg-zinc-900/50 border border-white/5 rounded-xl pl-3 pr-8 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 w-full font-mono"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">m</span>
                            </div>
                        </div>

                        {/* Goal Mapping */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5" /> Goal
                            </label>
                            <select
                                value={goalId}
                                onChange={e => setGoalId(e.target.value)}
                                className="bg-zinc-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 appearance-none"
                            >
                                <option value="none">-- No Goal --</option>
                                {goals.map(g => (
                                    <option key={g.id} value={g.id}>{g.title}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Anticipated Friction */}
                        <div className="flex flex-col gap-1.5 col-span-2">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                Anticipated Friction (Optional)
                            </label>
                            <input
                                type="text"
                                value={anticipatedFriction}
                                onChange={e => setAnticipatedFriction(e.target.value)}
                                placeholder="E.g. requires setup, anxiety inducing..."
                                className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                            />
                        </div>
                    </div>

                     {/* Type (One-off vs Recurring) */}
                    <div className="flex flex-col gap-1.5 mt-2">
                         <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" /> Schedule Type
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setType("one-off")}
                                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${type === "one-off" ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" : "bg-transparent border-white/5 text-zinc-500 hover:border-white/10"}`}
                            >
                                One-off
                            </button>
                             <button
                                type="button"
                                onClick={() => setType("recurring")}
                                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${type === "recurring" ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" : "bg-transparent border-white/5 text-zinc-500 hover:border-white/10"}`}
                            >
                                Recurring
                            </button>
                        </div>
                    </div>

                    {/* Conditional Date / Recurrence Inputs */}
                    <div className="grid grid-cols-2 gap-5 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {type === "recurring" ? (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Frequency</label>
                                    <select
                                        value={recurrenceRule}
                                        onChange={e => setRecurrenceRule(e.target.value)}
                                        className="bg-zinc-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 appearance-none"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekdays">Weekdays (Mon-Fri)</option>
                                        <option value="weekly">Weekly</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Repeat Until (Optional)</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="bg-zinc-900/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 w-full"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Due Date (Optional)</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="bg-zinc-900/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 w-full"
                                />
                            </div>
                        )}
                    </div>


                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting || !title.trim()}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/10"
                        >
                            {isSubmitting ? "Saving..." : "Add to Today"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
