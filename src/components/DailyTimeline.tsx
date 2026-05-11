import { Activity, Clock, Zap, Coffee, AlertTriangle } from "lucide-react"

export function DailyTimeline({ sessions }: { sessions: any[] }) {
    
    // Calculate total time spent today
    const totalMinutes = sessions.reduce((acc, session) => {
        if (!session.endTime) return acc;
        const start = new Date(session.startTime).getTime();
        const end = new Date(session.endTime).getTime();
        return acc + ((end - start) / 1000 / 60);
    }, 0);

    // Calculate context switches
    let contextSwitches = 0;
    if (sessions.length > 1) {
        for (let i = 1; i < sessions.length; i++) {
            if (sessions[i].taskId !== sessions[i-1].taskId) {
                contextSwitches++;
            }
        }
    }

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        const today = new Date();
        const isYesterday = d.getDate() !== today.getDate() || d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear();
        
        return isYesterday ? `Yest, ${timeStr}` : timeStr;
    }

    const getDuration = (startStr: string, endStr: string | null) => {
        if (!endStr) return "Active";
        const start = new Date(startStr).getTime();
        const end = new Date(endStr).getTime();
        const minutes = Math.round((end - start) / 1000 / 60);
        if (minutes < 1) return "<1m";
        return `${minutes}m`;
    }

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Timeline Header Metrics */}
            <div className="flex items-center justify-between gap-4 border border-zinc-800/80 bg-zinc-950/50 p-4 rounded-xl shadow-sm">
                <div className="flex-1 flex flex-col">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Time Audited</span>
                    <div className="flex items-end gap-2">
                        <span className="text-xl sm:text-2xl font-semibold text-zinc-100 tabular-nums">
                            {Math.floor(totalMinutes / 60)}h {Math.round(totalMinutes % 60)}m
                        </span>
                    </div>
                </div>
                
                <div className="w-px h-10 bg-zinc-800"></div>

                <div className="flex-1 flex flex-col pl-2">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Context Switches</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-xl sm:text-2xl font-semibold tabular-nums ${contextSwitches > 5 ? 'text-red-400' : 'text-zinc-100'}`}>
                            {contextSwitches}
                        </span>
                        {contextSwitches > 5 && (
                            <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">High</span>
                        )}
                    </div>
                </div>
            </div>

            {/* The Timeline Stream */}
            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-3 sm:before:ml-8 before:-translate-x-px before:h-full before:w-px before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
                {sessions.length === 0 ? (
                    <div className="relative flex items-center justify-center p-8 z-10">
                        <div className="bg-zinc-950 border border-dashed border-zinc-800 text-zinc-500 text-sm italic py-4 px-8 rounded-full shadow-sm text-center">
                            No execution recorded today. Start a task to begin tracking.
                        </div>
                    </div>
                ) : (
                    sessions.map((session, index) => (
                        <div key={session.id} className="relative flex items-start gap-4 sm:gap-6 group z-10 pl-1 sm:pl-6">
                            {/* Icon Point */}
                            <div className="flex items-center justify-center w-5 h-5 mt-3 rounded-full border border-zinc-800 bg-zinc-950 shadow shrink-0 z-10 relative">
                                {session.endTime ? (
                                    <Clock className="h-3 w-3 text-zinc-600" />
                                ) : (
                                    session.type === 'break' ? (
                                        <Coffee className="h-3 w-3 text-green-400 fill-green-400/20 animate-pulse" />
                                    ) : session.type === 'distraction' ? (
                                        <AlertTriangle className="h-3 w-3 text-red-400 fill-red-400/20 animate-pulse" />
                                    ) : (
                                        <Zap className="h-3 w-3 text-cyan-400 fill-cyan-400/20 animate-pulse" />
                                    )
                                )}
                            </div>

                            {/* Card content */}
                            <div className="flex-1 p-3.5 sm:p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/80 shadow-sm transition-all hover:shadow-md hover:border-zinc-700">
                                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 mb-2">
                                    <span className="font-mono text-[10px] sm:text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800 shrink-0">
                                        {formatTime(session.startTime)}
                                    </span>
                                    <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                                        session.endTime ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 
                                        session.type === 'break' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                        session.type === 'distraction' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                        'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                    }`}>
                                        {getDuration(session.startTime, session.endTime)}
                                    </span>
                                </div>
                                <h3 className={`font-medium text-xs sm:text-sm leading-snug flex flex-wrap items-center gap-2 ${session.endTime ? 'text-zinc-300' : 'text-zinc-100'}`}>
                                    {session.taskTitle || session.activityName || 'Unknown Focus'}
                                    {session.type && session.type !== 'one-off' && session.type !== 'recurring' && session.type !== 'focus' && (
                                        <span className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${
                                            session.type === 'break' ? 'text-green-500/70 border-green-500/20 bg-green-500/5' : 'text-red-500/70 border-red-500/20 bg-red-500/5'
                                        }`}>{session.type}</span>
                                    )}
                                </h3>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
