export interface Nudge {
    type: "intervention" | "overdue" | "context-switch" | "streak";
    message: string;
    taskId?: string;
}

interface Task {
    id: string;
    title: string;
    priority: string;
    status: string;
    dueDate: Date | string | null;
    scheduledDate?: Date | string | null;
}

interface Session {
    taskId: string | null;
    startTime: Date | string | null;
    endTime: Date | string | null;
}

export function computeNudges(tasks: Task[], sessions: Session[]): Nudge[] {
    const nudges: Nudge[] = [];
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Overdue high-priority tasks with no time logged today
    const overdueHigh = tasks.filter(t => {
        if (t.status === "completed") return false;
        if (t.priority !== "high" && t.priority !== "critical") return false;
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < now;
    });

    for (const task of overdueHigh) {
        nudges.push({
            type: "overdue",
            taskId: task.id,
            message: `🔴 "${task.title}" is overdue. This is slipping.`,
        });
    }

    // 2. Procrastination: High-priority task scheduled today, no session started after 4+ hours
    const hoursIntoDay = (now.getTime() - todayStart.getTime()) / 3600000;
    if (hoursIntoDay >= 4) {
        const untouchedHighPri = tasks.filter(t => {
            if (t.status === "completed" || t.status === "in-progress") return false;
            if (t.priority !== "high" && t.priority !== "critical") return false;
            if (!t.scheduledDate) return false;
            const scheduled = new Date(t.scheduledDate);
            scheduled.setHours(0, 0, 0, 0);
            const todayNorm = new Date(todayStart);
            return scheduled <= todayNorm;
        });

        for (const task of untouchedHighPri) {
            const hasSessionToday = sessions.some(
                s => s.taskId === task.id && s.startTime && new Date(s.startTime) >= todayStart
            );
            if (!hasSessionToday) {
                nudges.push({
                    type: "intervention",
                    taskId: task.id,
                    message: `⚠️ "${task.title}" has been untouched for ${Math.floor(hoursIntoDay)}+ hours. Resistance or blocker?`,
                });
            }
        }
    }

    // 3. Context-switch tax: 4+ task switches today
    const todaySessions = sessions.filter(
        s => s.startTime && new Date(s.startTime) >= todayStart
    );
    const taskSwitches = todaySessions.reduce((switches, s, i) => {
        if (i === 0) return 0;
        return todaySessions[i - 1].taskId !== s.taskId ? switches + 1 : switches;
    }, 0);

    if (taskSwitches >= 4) {
        const penalty = Math.round(taskSwitches * 5);
        nudges.push({
            type: "context-switch",
            message: `🔀 ${taskSwitches} context switches today. Estimated focus penalty: ~${penalty}%. Consider a no-switch block.`,
        });
    }

    return nudges;
}
