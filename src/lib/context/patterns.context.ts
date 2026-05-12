import { db } from "@/db";
import { sessions, tasks } from "@/db/schema";
import { gte, eq, isNotNull, and } from "drizzle-orm";

export async function buildPatternsContext(userId: string, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rawSessions = await db
        .select({
            startTime: sessions.startTime,
            endTime: sessions.endTime,
            taskId: sessions.taskId,
            taskPriority: tasks.priority,
        })
        .from(sessions)
        .leftJoin(tasks, eq(sessions.taskId, tasks.id))
        .where(and(eq(sessions.userId, userId), gte(sessions.startTime, since), isNotNull(sessions.endTime)));

    if (rawSessions.length === 0) {
        return {
            commitmentScore: 0,
            avgSessionLengthMinutes: 0,
            peakHour: null,
            mostProductiveDay: null,
            totalFocusHours: 0,
            highPriorityFocusPercent: 0,
        };
    }

    // Hour distribution - find peak focus hour
    const hourCounts: Record<number, number> = {};
    let totalMinutes = 0;
    let highPriorityMinutes = 0;

    for (const s of rawSessions) {
        if (!s.endTime || !s.startTime) continue;
        const hour = new Date(s.startTime).getHours();
        const minutes = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
        hourCounts[hour] = (hourCounts[hour] || 0) + minutes;
        totalMinutes += minutes;
        if (s.taskPriority === "high" || s.taskPriority === "critical") {
            highPriorityMinutes += minutes;
        }
    }

    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Day of week distribution
    const dayCounts: Record<string, number> = {};
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const s of rawSessions) {
        if (!s.startTime) continue;
        const day = dayNames[new Date(s.startTime).getDay()];
        dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    const mostProductiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Commitment score: % of scheduled tasks that had at least one session in the last 14 days
    const scheduledTasks = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(
            eq(tasks.userId, userId),
            isNotNull(tasks.scheduledDate),
            gte(tasks.scheduledDate!, since)
        ));

    const workedTaskIds = new Set(rawSessions.map(s => s.taskId));
    const commitmentScore = scheduledTasks.length > 0
        ? Math.round((scheduledTasks.filter(t => workedTaskIds.has(t.id)).length / scheduledTasks.length) * 100)
        : 0;

    return {
        commitmentScore,
        avgSessionLengthMinutes: Math.round(totalMinutes / rawSessions.length),
        peakHour: peakHour ? `${peakHour}:00` : null,
        mostProductiveDay: mostProductiveDay || null,
        totalFocusHours: Math.round(totalMinutes / 60 * 10) / 10,
        highPriorityFocusPercent: totalMinutes > 0
            ? Math.round((highPriorityMinutes / totalMinutes) * 100)
            : 0,
    };
}

export type PatternsContext = Awaited<ReturnType<typeof buildPatternsContext>>;
