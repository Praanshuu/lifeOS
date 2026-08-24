import { db } from "@/db";
import { tasks, sessions, goals } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { localDateStr } from "@/lib/utils";

export async function buildTasksContext(userId: string) {
    const allTasks = await db
        .select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            type: tasks.type,
            recurrenceRule: tasks.recurrenceRule,
            priority: tasks.priority,
            estimatedMinutes: tasks.estimatedMinutes,
            dueDate: tasks.dueDate,
            scheduledDate: tasks.scheduledDate,
            energyLevel: tasks.energyLevel,
            anticipatedFriction: tasks.anticipatedFriction,
            goalTitle: goals.title,
            parentTaskId: tasks.parentTaskId,
            spentMinutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${sessions.endTime} - ${sessions.startTime})) / 60), 0)`.mapWith(Number),
        })
        .from(tasks)
        .leftJoin(sessions, eq(tasks.id, sessions.taskId))
        .leftJoin(goals, eq(tasks.goalId, goals.id))
        .where(eq(tasks.userId, userId))
        .groupBy(tasks.id, goals.title);

    const now = new Date();
    const today = localDateStr(now);

    const parentIds = new Set(allTasks.filter(t => t.parentTaskId).map(t => t.parentTaskId!));

    const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const isWeekday = currentDayOfWeek >= 1 && currentDayOfWeek <= 5;
    const isMonday = currentDayOfWeek === 1;

    // For recurring tasks, dueDate acts as "Repeat Until". If it's expired, it shouldn't be pending.
    const allPending = allTasks.filter(t => {
        if (t.status === "pending" || t.status === "in-progress") return true;
        if (t.status === "active" && t.type === "recurring") {
            if (t.dueDate && new Date(t.dueDate) < now) return false;
            
            // Check frequency rule
            if (t.recurrenceRule === "daily") return true;
            if (t.recurrenceRule === "weekdays" && isWeekday) return true;
            if (t.recurrenceRule === "weekly" && isMonday) return true; // Default weekly to Mondays
            
            return false;
        }
        return false;
    });

    const pendingLeaf = allPending.filter(t => {
        if (parentIds.has(t.id)) return false; 
        if (t.parentTaskId) {
            if (!t.scheduledDate) return true;
            return localDateStr(new Date(t.scheduledDate)) <= today;
        }
        return true;
    });

    const pendingComposite = allPending.filter(t => parentIds.has(t.id));

    const overdue = pendingLeaf.filter(t => t.dueDate && new Date(t.dueDate) < now && t.type !== "recurring");
    const highPriorityPending = pendingLeaf.filter(t => t.priority === "high" || t.priority === "critical");
    const completed = allTasks.filter(t => t.status === "completed");

    return {
        totalTasks: allTasks.length,
        pending: pendingLeaf.map(t => {
            const spent = Math.round(t.spentMinutes);
            const est = t.estimatedMinutes || 30;
            const remaining = Math.max(0, est - spent);
            return {
                id: t.id,
                title: t.title,
                status: t.status,
                type: t.type,
                recurrenceRule: t.recurrenceRule,
                priority: t.priority,
                estimatedMinutes: est,
                spentMinutes: spent,
                remainingMinutes: remaining,
                anticipatedFriction: t.anticipatedFriction || "medium",
                dueDate: t.dueDate ? localDateStr(new Date(t.dueDate)) : null,
                scheduledDate: t.scheduledDate ? localDateStr(new Date(t.scheduledDate)) : null,
                goal: t.goalTitle || null,
                parentTask: t.parentTaskId ? allTasks.find(p => p.id === t.parentTaskId)?.title || null : null,
                isOverdue: t.dueDate && t.type !== "recurring" ? new Date(t.dueDate) < now : false,
            };
        }),
        // Composite tasks sent for context only — so AI understands the big picture
        compositeTasks: pendingComposite.map(t => ({
            id: t.id,
            title: t.title,
            goal: t.goalTitle || null,
            note: "This is a parent task managed via micro-tasks. Do NOT schedule it directly.",
        })),
        completedCount: completed.length,
        overdueCount: overdue.length,
        highPriorityPendingCount: highPriorityPending.length,
    };
}

export type TasksContext = Awaited<ReturnType<typeof buildTasksContext>>;
