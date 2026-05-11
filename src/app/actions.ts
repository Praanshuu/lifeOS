"use server";

import { db } from "@/db";
import { tasks, sessions, goals, dailyPlans } from "@/db/schema";
import { eq, sql, gte, and, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";


export async function getTasks() {
    noStore();
    const parentTasks = alias(tasks, "parentTask");
    const result = await db
        .select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            estimatedMinutes: tasks.estimatedMinutes,
            createdAt: tasks.createdAt,
            dueDate: tasks.dueDate,
            scheduledDate: tasks.scheduledDate,
            energyLevel: tasks.energyLevel,
            type: tasks.type,
            recurrenceRule: tasks.recurrenceRule,
            tags: tasks.tags,
            goalId: tasks.goalId,
            parentTaskId: tasks.parentTaskId,
            parentTaskTitle: parentTasks.title,
            spentMinutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${sessions.endTime} - ${sessions.startTime})) / 60), 0)`.mapWith(Number)
        })
        .from(tasks)
        .leftJoin(sessions, eq(tasks.id, sessions.taskId))
        .leftJoin(parentTasks, eq(tasks.parentTaskId, parentTasks.id))
        .groupBy(tasks.id, parentTasks.title);
        
    return result;
}

export async function getSessionsForToday() {
    noStore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // We need to import 'activities' if we want to join it
    const { activities } = await import("@/db/schema");

    const result = await db
        .select({
            id: sessions.id,
            taskId: sessions.taskId,
            activityId: sessions.activityId,
            type: sessions.type,
            taskTitle: tasks.title,
            activityName: activities.name,
            startTime: sessions.startTime,
            endTime: sessions.endTime,
        })
        .from(sessions)
        .leftJoin(tasks, eq(sessions.taskId, tasks.id))
        .leftJoin(activities, eq(sessions.activityId, activities.id))
        .where(
            or(
                gte(sessions.startTime, today),
                gte(sessions.endTime, today),
                isNull(sessions.endTime)
            )
        )
        .orderBy(sessions.startTime);

    return result;
}

export async function getGoals() {
    noStore();
    return await db.select().from(goals);
}

export async function createTask(
    title: string, 
    goalId?: string | null, 
    scheduledDate?: Date | null, 
    priority?: string, 
    type?: string,
    estimatedMinutes?: number,
    energyLevel?: string,
    anticipatedFriction?: string,
    dueDate?: Date | null,
    recurrenceRule?: string | null
) { 
    await db.insert(tasks).values({ 
        title, 
        goalId: goalId || null,
        scheduledDate: scheduledDate || null,
        dueDate: dueDate || null,
        priority: priority || "medium",
        type: type || "one-off",
        status: type === "recurring" ? "active" : "pending",
        recurrenceRule: recurrenceRule || null,
        estimatedMinutes: estimatedMinutes || 30,
        energyLevel: energyLevel || "medium",
        anticipatedFriction: anticipatedFriction || null
    }); 
    revalidatePath("/goals");
    revalidatePath("/");
}

export async function createGoal(
    title: string,
    importance?: number,
    logicalReason?: string,
    emotionalReason?: string
) {
    await db.insert(goals).values({ 
        title,
        importance: importance || 1,
        logicalReason: logicalReason || null,
        emotionalReason: emotionalReason || null
    });
    revalidatePath("/goals");
}

export async function updateGoalDetails(
    id: string,
    data: {
        title?: string;
        importance?: number;
        logicalReason?: string | null;
        emotionalReason?: string | null;
        status?: string;
    }
) {
    await db.update(goals).set(data).where(eq(goals.id, id));
    revalidatePath("/goals");
}

export async function deleteTaskAction(id: string) { await db.delete(tasks).where(eq(tasks.id, id)); }

export async function updateTaskStatus(id: string, status: string) {
    await db.update(tasks).set({ status }).where(eq(tasks.id, id));
    revalidatePath("/goals");
    revalidatePath("/");
}

export async function updateTaskPriority(id: string, priority: string) {
    await db.update(tasks).set({ priority }).where(eq(tasks.id, id));
    revalidatePath("/goals");
    revalidatePath("/");
}

export async function updateTaskDetails(
    id: string, 
    data: { 
        title?: string;
        status?: string;
        goalId?: string | null; 
        dueDate?: Date | null; 
        scheduledDate?: Date | null; 
        energyLevel?: string | null; 
        anticipatedFriction?: string | null;
        estimatedMinutes?: number;
        parentTaskId?: string | null;
    }
) {
    await db.update(tasks).set(data).where(eq(tasks.id, id));
    revalidatePath("/goals");
    revalidatePath("/");
}

export async function completeTaskManually(taskId: string, spentMinutes: number, notes: string) {
    const { sessions, tasks, dailyPlans } = await import("@/db/schema");
    
    // 1. Create a retroactive session
    const now = new Date();
    const startTime = new Date(now.getTime() - spentMinutes * 60000);
    
    await db.insert(sessions).values({
        taskId,
        startTime,
        endTime: now,
        frictionLog: notes || null,
    });

    // 2. Update task status
    await db.update(tasks).set({ status: 'completed' }).where(eq(tasks.id, taskId));

    // 3. Update any daily plan items for this task today
    const today = now.toISOString().split("T")[0];
    await db.update(dailyPlans)
        .set({ status: 'done' })
        .where(and(eq(dailyPlans.taskId, taskId), eq(dailyPlans.date, today)));

    revalidatePath("/goals");
    revalidatePath("/");
}

export async function startSession(taskId: string) {
    const result = await db.insert(sessions).values({
        taskId,
        startTime: new Date(),
    }).returning({ id: sessions.id });
    revalidatePath("/");
    return result[0].id;
}

export async function stopSession(sessionId: string) {
    await db.update(sessions)
        .set({ endTime: new Date() })
        .where(eq(sessions.id, sessionId));
    revalidatePath("/");
}

export async function getAllSessions() {
    noStore();
    const { activities } = await import("@/db/schema");
    return await db
        .select({
            id: sessions.id,
            taskId: sessions.taskId,
            activityId: sessions.activityId,
            type: sessions.type,
            taskTitle: tasks.title,
            activityName: activities.name,
            startTime: sessions.startTime,
            endTime: sessions.endTime,
            interruptions: sessions.interruptions,
            frictionLog: sessions.frictionLog,
        })
        .from(sessions)
        .leftJoin(tasks, eq(sessions.taskId, tasks.id))
        .leftJoin(activities, eq(sessions.activityId, activities.id))
        .orderBy(sql`${sessions.startTime} DESC`);
}

export async function updateSessionFriction(id: string, frictionLog: string, interruptions?: number) {
    const updates: any = { frictionLog };
    if (interruptions !== undefined) updates.interruptions = interruptions;
    
    await db.update(sessions).set(updates).where(eq(sessions.id, id));
    revalidatePath("/logs");
}

export async function startActivitySession(activityType: string) {
    const { activities } = await import("@/db/schema");
    const existingActivities = await db.select().from(activities).where(eq(activities.type, activityType)).limit(1);
    if (existingActivities.length === 0) return null;
    const activity = existingActivities[0];
    const result = await db.insert(sessions).values({
        type: activityType,
        activityId: activity.id,
        startTime: new Date(),
    }).returning({ id: sessions.id });
    revalidatePath("/");
    return result[0].id;
}

// ─── Daily Plan Actions ───────────────────────────────────────────────────────

export async function getTodaysPlan() {
    noStore();
    const today = new Date().toISOString().split("T")[0];
    const result = await db
        .select({
            id: dailyPlans.id,
            date: dailyPlans.date,
            taskId: dailyPlans.taskId,
            taskTitle: tasks.title,
            estimatedMinutes: tasks.estimatedMinutes,
            priority: tasks.priority,
            position: dailyPlans.position,
            tier: dailyPlans.tier,
            rationale: dailyPlans.rationale,
            status: dailyPlans.status,
            skipReason: dailyPlans.skipReason,
            skipTrigger: dailyPlans.skipTrigger,
            committedAt: dailyPlans.committedAt,
            spentMinutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${sessions.endTime} - ${sessions.startTime})) / 60), 0)`.mapWith(Number),
        })
        .from(dailyPlans)
        .leftJoin(tasks, eq(dailyPlans.taskId, tasks.id))
        .leftJoin(sessions, eq(sessions.taskId, tasks.id))
        .where(eq(dailyPlans.date, today))
        .groupBy(dailyPlans.id, tasks.title, tasks.estimatedMinutes, tasks.priority)
        .orderBy(dailyPlans.position);
    return result;
}

export async function updatePlanItemStatus(id: string, status: string, skipReason?: string, skipTrigger?: string) {
    const updates: any = { status };
    if (skipReason) updates.skipReason = skipReason;
    if (skipTrigger) updates.skipTrigger = skipTrigger;
    
    // 1. Update the daily plan item
    const updatedPlan = await db.update(dailyPlans).set(updates).where(eq(dailyPlans.id, id)).returning();
    
    // 2. Sync to the underlying task if completing, but only if it's NOT a recurring task
    if (updatedPlan.length > 0 && (status === 'completed' || status === 'pending')) {
        const planItem = updatedPlan[0];
        const taskRow = await db.select({ type: tasks.type }).from(tasks).where(eq(tasks.id, planItem.taskId!));
        
        if (taskRow.length > 0 && taskRow[0].type !== 'recurring') {
            await db.update(tasks).set({ status }).where(eq(tasks.id, planItem.taskId!));
        }
    }
    
    revalidatePath("/");
}

export async function commitTodaysPlan() {
    const today = new Date().toISOString().split("T")[0];
    await db
        .update(dailyPlans)
        .set({ committedAt: new Date() })
        .where(eq(dailyPlans.date, today));
    revalidatePath("/");
}

/**
 * Persists a new task order for a given date's plan.
 * @param date      ISO date string (YYYY-MM-DD)
 * @param orderedIds  All plan item IDs for that date in the desired order (index 0 = position 1)
 */
export async function reorderPlanItems(date: string, orderedIds: string[]) {
    await Promise.all(
        orderedIds.map((id, index) =>
            db.update(dailyPlans)
                .set({ position: index + 1 })
                .where(and(eq(dailyPlans.id, id), eq(dailyPlans.date, date)))
        )
    );
    revalidatePath("/");
}

export async function removePlanItem(id: string) {
    await db.delete(dailyPlans).where(eq(dailyPlans.id, id));
    revalidatePath("/");
}

export async function addPlanItem(taskId: string, tier: string = "target") {
    const today = new Date().toISOString().split("T")[0];
    
    // Find the current max position for today's plan to append at the bottom
    const existingItems = await db.select({ position: dailyPlans.position }).from(dailyPlans).where(eq(dailyPlans.date, today));
    const nextPosition = existingItems.length > 0 ? Math.max(...existingItems.map(i => i.position)) + 1 : 1;

    const result = await db.insert(dailyPlans).values({
        date: today,
        taskId,
        position: nextPosition,
        tier,
        status: "planned",
    }).returning();
    
    revalidatePath("/");
    return result[0];
}
