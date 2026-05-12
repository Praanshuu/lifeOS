import { db } from "@/db";
import { sessions, tasks } from "@/db/schema";
import { gte, sql, eq, and, isNotNull } from "drizzle-orm";

export async function buildSessionsContext(userId: string, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rawSessions = await db
        .select({
            id: sessions.id,
            taskId: sessions.taskId,
            taskTitle: tasks.title,
            taskPriority: tasks.priority,
            startTime: sessions.startTime,
            endTime: sessions.endTime,
            interruptions: sessions.interruptions,
        })
        .from(sessions)
        .leftJoin(tasks, eq(sessions.taskId, tasks.id))
        .where(and(eq(sessions.userId, userId), gte(sessions.startTime, since), isNotNull(sessions.endTime)))
        .orderBy(sessions.startTime);

    // Group by day
    const byDay: Record<string, typeof rawSessions> = {};
    for (const s of rawSessions) {
        const day = new Date(s.startTime!).toISOString().split("T")[0];
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(s);
    }

    const dailySummaries = Object.entries(byDay).map(([date, daySessions]) => {
        const totalMinutes = daySessions.reduce((sum, s) => {
            if (!s.endTime) return sum;
            return sum + (new Date(s.endTime).getTime() - new Date(s.startTime!).getTime()) / 60000;
        }, 0);

        // Count context switches (task changes within a day)
        const uniqueTasks = new Set(daySessions.map(s => s.taskId)).size;
        const contextSwitches = Math.max(0, daySessions.length - 1);

        return {
            date,
            totalMinutes: Math.round(totalMinutes),
            sessionCount: daySessions.length,
            uniqueTasksWorked: uniqueTasks,
            contextSwitches,
            tasks: daySessions.map(s => ({
                title: s.taskTitle,
                priority: s.taskPriority,
                minutesSpent: s.endTime
                    ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime!).getTime()) / 60000)
                    : 0,
            })),
        };
    });

    const avgDailyMinutes = dailySummaries.length > 0
        ? Math.round(dailySummaries.reduce((s, d) => s + d.totalMinutes, 0) / dailySummaries.length)
        : 0;

    return {
        periodDays: days,
        avgDailyFocusMinutes: avgDailyMinutes,
        totalSessionsInPeriod: rawSessions.length,
        dailySummaries,
    };
}

export type SessionsContext = Awaited<ReturnType<typeof buildSessionsContext>>;
