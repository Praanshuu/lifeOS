"use client";

import { useState } from "react";
import { updateSessionFriction } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Search, Save, Edit2, PlayCircle, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type SessionRow = {
    id: string;
    taskId: string | null;
    type: string | null;
    taskTitle: string;
    date: string;
    startTime: Date | null;
    endTime: Date | null;
    durationMinutes: number | null;
    interruptions: number;
    frictionLog: string;
};

export function LogsTable({ initialSessions }: { initialSessions: SessionRow[] }) {
    const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    const filteredSessions = sessions.filter(s => 
        s.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.frictionLog.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.date.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSaveFriction = async (id: string) => {
        try {
            await updateSessionFriction(id, editValue);
            setSessions(sessions.map(s => s.id === id ? { ...s, frictionLog: editValue } : s));
        } catch (e) {
            console.error(e);
        } finally {
            setEditingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <Search className="w-4 h-4 text-zinc-500 ml-2" />
                <Input 
                    placeholder="Search logs by task, date, or notes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-none bg-transparent focus-visible:ring-0 shadow-none text-sm placeholder:text-zinc-600"
                />
            </div>

            {/* Table */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50 border-b border-zinc-800">
                        <tr>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium w-1/4">Task</th>
                            <th className="px-4 py-3 font-medium">Session Time</th>
                            <th className="px-4 py-3 font-medium">Friction & Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {filteredSessions.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-zinc-600">
                                    No sessions match your search.
                                </td>
                            </tr>
                        ) : (
                            filteredSessions.map((session) => (
                                <tr key={session.id} className="hover:bg-zinc-900/30 transition-colors group">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="font-medium text-zinc-300">{session.date}</div>
                                        {session.durationMinutes !== null ? (
                                            <div className="text-xs text-cyan-500 font-mono mt-0.5">{session.durationMinutes}m logged</div>
                                        ) : (
                                            <div className="text-xs text-yellow-500 mt-0.5 flex items-center gap-1">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500"></span>
                                                </span>
                                                In Progress
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-zinc-200 line-clamp-2">{session.taskTitle}</div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <PlayCircle className="w-3 h-3 text-zinc-500" />
                                            {session.startTime ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(session.startTime) : "-"}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <StopCircle className="w-3 h-3 text-zinc-500" />
                                            {session.endTime ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(session.endTime) : "---"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 min-w-[250px]">
                                        {editingId === session.id ? (
                                            <div className="flex items-start gap-2">
                                                <textarea
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 min-h-[60px] resize-none"
                                                    placeholder="Log friction, distractions, or notes..."
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                            handleSaveFriction(session.id);
                                                        }
                                                    }}
                                                />
                                                <div className="flex flex-col gap-1">
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                                        onClick={() => handleSaveFriction(session.id)}
                                                    >
                                                        <Save className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                                                        onClick={() => setEditingId(null)}
                                                    >
                                                        <span className="text-xs">✕</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div 
                                                className="group/cell flex items-start justify-between gap-4 cursor-pointer rounded-md p-1.5 -mx-1.5 hover:bg-zinc-800/50 transition-colors"
                                                onClick={() => {
                                                    setEditingId(session.id);
                                                    setEditValue(session.frictionLog);
                                                }}
                                            >
                                                <p className={`text-sm ${session.frictionLog ? "text-zinc-300" : "text-zinc-600 italic"}`}>
                                                    {session.frictionLog || "No notes. Click to add a friction log..."}
                                                </p>
                                                <Edit2 className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
