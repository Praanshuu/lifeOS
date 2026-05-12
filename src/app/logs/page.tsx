import { getAllSessions } from "@/app/actions";
import { LogsTable } from "./LogsTable";
import { auth } from "@clerk/nextjs/server";

export default async function LogsPage() {
    const { userId } = await auth();
    if (!userId) {
        return <div className="text-zinc-300">Sign in to view activity logs.</div>;
    }

    const rawSessions = await getAllSessions();

    // Map database session rows to a cleaner format for the table
    const sessions = rawSessions.map(s => ({
        id: s.id,
        taskId: s.taskId,
        type: s.type,
        taskTitle: s.taskTitle || s.activityName || "Unknown Activity",
        date: s.startTime ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(s.startTime)) : "Unknown",
        startTime: s.startTime ? new Date(s.startTime) : null,
        endTime: s.endTime ? new Date(s.endTime) : null,
        durationMinutes: s.startTime && s.endTime 
            ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000) 
            : null,
        interruptions: s.interruptions || 0,
        frictionLog: s.frictionLog || "",
    }));

    return (
        <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Activity Logs</h1>
                <p className="text-sm text-zinc-400">Track exactly where your time went, identify friction points, and review your focus sessions.</p>
            </div>

            <div className="w-full">
                <LogsTable initialSessions={sessions} />
            </div>
        </div>
    );
}
