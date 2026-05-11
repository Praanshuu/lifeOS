"use client";

import { useState } from "react";

export default function ManualCompletionModal({
    taskTitle,
    estimatedMinutes,
    onConfirm,
    onCancel
}: {
    taskTitle: string;
    estimatedMinutes: number;
    onConfirm: (spentMinutes: number, notes: string) => void;
    onCancel: () => void;
}) {
    const [spentMinutes, setSpentMinutes] = useState<number>(estimatedMinutes || 30);
    const [notes, setNotes] = useState("");

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-sm font-semibold text-zinc-100 mb-1">
                    Complete Task Manually
                </h3>
                <p className="text-xs text-zinc-500 mb-4 line-clamp-1" title={taskTitle}>
                    {taskTitle}
                </p>
                
                <div className="flex flex-col gap-4 mb-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Time Spent (Minutes)</label>
                        <input
                            type="number"
                            min="1"
                            step="5"
                            value={spentMinutes}
                            onChange={(e) => setSpentMinutes(parseInt(e.target.value) || 0)}
                            className="text-sm px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Execution Notes (Optional)</label>
                        <textarea
                            placeholder="E.g. took longer because of X, or was easier than expected..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="text-sm px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 resize-none h-20"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={onCancel} className="flex-1 text-sm py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 transition-colors">Cancel</button>
                    <button
                        onClick={() => onConfirm(spentMinutes, notes)}
                        className="flex-1 text-sm py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                        disabled={spentMinutes <= 0}
                    >
                        Mark Completed
                    </button>
                </div>
            </div>
        </div>
    );
}
