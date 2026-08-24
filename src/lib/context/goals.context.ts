import { db } from "@/db";
import { goals, tasks, sessions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function buildGoalsContext(userId: string) {
    const allGoals = await db
        .select({
            id: goals.id,
            title: goals.title,
            importance: goals.importance,
            logicalReason: goals.logicalReason,
            emotionalReason: goals.emotionalReason,
            deadline: goals.deadline,
            status: goals.status,
            totalTasks: sql<number>`COUNT(DISTINCT ${tasks.id})`.mapWith(Number),
            completedTasks: sql<number>`COUNT(DISTINCT CASE WHEN ${tasks.status} = 'completed' THEN ${tasks.id} END)`.mapWith(Number),
            minutesLogged: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${sessions.endTime} - ${sessions.startTime})) / 60), 0)`.mapWith(Number),
            lastSessionTime: sql<Date | null>`MAX(${sessions.startTime})`,
        })
        .from(goals)
        .leftJoin(tasks, and(eq(tasks.goalId, goals.id), eq(tasks.userId, userId)))
        .leftJoin(sessions, and(eq(sessions.taskId, tasks.id), eq(sessions.userId, userId)))
        .where(eq(goals.userId, userId))
        .groupBy(goals.id);

    const now = Date.now();

    return allGoals.map(g => {
        const pendingTasks = Math.max(0, g.totalTasks - g.completedTasks);
        const lastSessionDate = g.lastSessionTime ? new Date(g.lastSessionTime).toISOString().split("T")[0] : null;
        const daysSinceLastSession = g.lastSessionTime
            ? Math.floor((now - new Date(g.lastSessionTime).getTime()) / 86_400_000)
            : null;
        
        // Stagnant if active, has pending tasks, and hasn't been worked on in 5+ days (or never worked on)
        const isStagnant = g.status === "active" && pendingTasks > 0 && (daysSinceLastSession === null || daysSinceLastSession >= 5);

        return {
            id: g.id,
            title: g.title,
            importance: g.importance,
            logicalReason: g.logicalReason,
            emotionalReason: g.emotionalReason,
            status: g.status,
            deadline: g.deadline ? new Date(g.deadline).toISOString().split("T")[0] : null,
            daysUntilDeadline: g.deadline
                ? Math.ceil((new Date(g.deadline).getTime() - now) / 86_400_000)
                : null,
            progress: g.totalTasks > 0
                ? Math.round((g.completedTasks / g.totalTasks) * 100)
                : 0,
            totalTasks: g.totalTasks,
            completedTasks: g.completedTasks,
            pendingTasks,
            minutesLogged: Math.round(g.minutesLogged),
            lastSessionDate,
            daysSinceLastSession,
            isStagnant,
        };
    });
}

export type GoalsContext = Awaited<ReturnType<typeof buildGoalsContext>>;
