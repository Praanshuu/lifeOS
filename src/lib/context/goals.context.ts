import { db } from "@/db";
import { goals, tasks, sessions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function buildGoalsContext() {
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
        })
        .from(goals)
        .leftJoin(tasks, eq(tasks.goalId, goals.id))
        .leftJoin(sessions, eq(sessions.taskId, tasks.id))
        .groupBy(goals.id);

    return allGoals.map(g => ({
        id: g.id,
        title: g.title,
        importance: g.importance,
        logicalReason: g.logicalReason,
        emotionalReason: g.emotionalReason,
        status: g.status,
        deadline: g.deadline ? new Date(g.deadline).toISOString().split("T")[0] : null,
        daysUntilDeadline: g.deadline
            ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86_400_000)
            : null,
        progress: g.totalTasks > 0
            ? Math.round((g.completedTasks / g.totalTasks) * 100)
            : 0,
        totalTasks: g.totalTasks,
        completedTasks: g.completedTasks,
        minutesLogged: Math.round(g.minutesLogged),
    }));
}

export type GoalsContext = Awaited<ReturnType<typeof buildGoalsContext>>;
