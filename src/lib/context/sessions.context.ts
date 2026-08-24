import { db } from "@/db";
import { sessions, tasks } from "@/db/schema";
import { gte, eq, and, isNotNull } from "drizzle-orm";
import { localDateStr } from "@/lib/utils";

export async function buildSessionsContext(userId: string, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const todayStr = localDateStr();

    const rawSessions = await db
        .select({
            id: sessions.id,
            type: sessions.type,
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
        if (!s.startTime) continue;
        const day = localDateStr(new Date(s.startTime));
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(s);
    }

    const dailySummaries = Object.entries(byDay).map(([date, daySessions]) => {
        const focusSessions = daySessions.filter(s => s.type === "focus" || (!s.type && s.taskId));
        const totalMinutes = focusSessions.reduce((sum, s) => {
            if (!s.endTime || !s.startTime) return sum;
            return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
        }, 0);

        const breakMinutes = daySessions.filter(s => s.type === "break").reduce((sum, s) => {
            if (!s.endTime || !s.startTime) return sum;
            return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
        }, 0);

        const distractionMinutes = daySessions.filter(s => s.type === "distraction").reduce((sum, s) => {
            if (!s.endTime || !s.startTime) return sum;
            return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
        }, 0);

        // Count context switches (task changes within a day)
        const uniqueTasks = new Set(focusSessions.map(s => s.taskId).filter(Boolean)).size;
        const contextSwitches = Math.max(0, focusSessions.length - 1);

        return {
            date,
            totalMinutes: Math.round(totalMinutes),
            breakMinutes: Math.round(breakMinutes),
            distractionMinutes: Math.round(distractionMinutes),
            sessionCount: daySessions.length,
            uniqueTasksWorked: uniqueTasks,
            contextSwitches,
            tasks: focusSessions.map(s => ({
                title: s.taskTitle || "Focus Session",
                priority: s.taskPriority || "medium",
                minutesSpent: s.endTime && s.startTime
                    ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000)
                    : 0,
            })),
        };
    });

    const todaySummary = dailySummaries.find(d => d.date === todayStr);
    const todayFocusMinutes = todaySummary?.totalMinutes ?? 0;
    const todayBreakMinutes = todaySummary?.breakMinutes ?? 0;
    const todayDistractionMinutes = todaySummary?.distractionMinutes ?? 0;

    const avgDailyMinutes = dailySummaries.length > 0
        ? Math.round(dailySummaries.reduce((s, d) => s + d.totalMinutes, 0) / dailySummaries.length)
        : 0;

    return {
        periodDays: days,
        avgDailyFocusMinutes: avgDailyMinutes,
        totalSessionsInPeriod: rawSessions.length,
        todayFocusMinutes,
        todayBreakMinutes,
        todayDistractionMinutes,
        dailySummaries,
    };
}

export type SessionsContext = Awaited<ReturnType<typeof buildSessionsContext>>;
