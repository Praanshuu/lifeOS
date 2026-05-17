"use server";

import { db } from "@/db";
import { tasks, sessions, goals, dailyPlans } from "@/db/schema";
import { eq, sql, gte, and, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { ensureUserSetup, requireUserId } from "@/lib/auth";
import { localDateStr } from "@/lib/utils";

async function getScopedUserId() {
    const userId = await requireUserId();
    await ensureUserSetup(userId);
    return userId;
}

export async function getTasks() {
    noStore();
    const userId = await getScopedUserId();
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
        .leftJoin(sessions, and(eq(tasks.id, sessions.taskId), eq(sessions.userId, userId)))
        .leftJoin(parentTasks, eq(tasks.parentTaskId, parentTasks.id))
        .where(eq(tasks.userId, userId))
        .groupBy(tasks.id, parentTasks.title);
        
    return result;
}

export async function getSessionsForToday() {
    noStore();
    const userId = await getScopedUserId();
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
            and(
                eq(sessions.userId, userId),
                or(
                    gte(sessions.startTime, today),
                    gte(sessions.endTime, today),
                    isNull(sessions.endTime)
                )
            )
        )
        .orderBy(sessions.startTime);

    return result;
}

export async function getGoals() {
    noStore();
    const userId = await getScopedUserId();
    return await db.select().from(goals).where(eq(goals.userId, userId));
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
    const userId = await getScopedUserId();
    await db.insert(tasks).values({ 
        userId,
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
    const userId = await getScopedUserId();
    await db.insert(goals).values({ 
        userId,
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
    const userId = await getScopedUserId();
    await db.update(goals).set(data).where(and(eq(goals.id, id), eq(goals.userId, userId)));
    revalidatePath("/goals");
}

export async function deleteTaskAction(id: string) {
    const userId = await getScopedUserId();
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function updateTaskStatus(id: string, status: string) {
    const userId = await getScopedUserId();
    await db.update(tasks).set({ status }).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    revalidatePath("/goals");
    revalidatePath("/");
}

export async function updateTaskPriority(id: string, priority: string) {
    const userId = await getScopedUserId();
    await db.update(tasks).set({ priority }).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
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
    const userId = await getScopedUserId();
    await db.update(tasks).set(data).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    revalidatePath("/goals");
    revalidatePath("/");
}

export async function completeTaskManually(taskId: string, spentMinutes: number, notes: string) {
    const userId = await getScopedUserId();
    const { sessions, tasks, dailyPlans } = await import("@/db/schema");
    
    // 1. Create a retroactive session
    const now = new Date();
    const startTime = new Date(now.getTime() - spentMinutes * 60000);
    
    await db.insert(sessions).values({
        userId,
        taskId,
        startTime,
        endTime: now,
        frictionLog: notes || null,
    });

    // 2. Update task status
    await db.update(tasks).set({ status: "completed" }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    // 3. Update any daily plan items for this task today
    const today = localDateStr(now);
    await db.update(dailyPlans)
        .set({ status: "done" })
        .where(and(eq(dailyPlans.taskId, taskId), eq(dailyPlans.date, today), eq(dailyPlans.userId, userId)));

    revalidatePath("/goals");
    revalidatePath("/");
}

export async function startSession(taskId: string) {
    const userId = await getScopedUserId();
    const result = await db.insert(sessions).values({
        userId,
        taskId,
        startTime: new Date(),
    }).returning({ id: sessions.id });
    revalidatePath("/");
    return result[0].id;
}

export async function stopSession(sessionId: string) {
    const userId = await getScopedUserId();
    await db.update(sessions)
        .set({ endTime: new Date() })
        .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
    revalidatePath("/");
}

export async function getAllSessions() {
    noStore();
    const userId = await getScopedUserId();
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
        .where(eq(sessions.userId, userId))
        .orderBy(sql`${sessions.startTime} DESC`);
}

export async function updateSessionFriction(id: string, frictionLog: string, interruptions?: number) {
    const userId = await getScopedUserId();
    const updates: any = { frictionLog };
    if (interruptions !== undefined) updates.interruptions = interruptions;
    
    await db.update(sessions).set(updates).where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
    revalidatePath("/logs");
}

export async function startActivitySession(activityType: string) {
    const userId = await getScopedUserId();
    const { activities } = await import("@/db/schema");
    const existingActivities = await db.select().from(activities).where(and(eq(activities.type, activityType), eq(activities.userId, userId))).limit(1);
    if (existingActivities.length === 0) return null;
    const activity = existingActivities[0];
    const result = await db.insert(sessions).values({
        userId,
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
    const userId = await getScopedUserId();
    const today = localDateStr();
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
            allocatedMinutes: dailyPlans.allocatedMinutes,
            committedAt: dailyPlans.committedAt,
            spentMinutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${sessions.endTime} - ${sessions.startTime})) / 60), 0)`.mapWith(Number),
        })
        .from(dailyPlans)
        .leftJoin(tasks, eq(dailyPlans.taskId, tasks.id))
        .leftJoin(sessions, and(eq(sessions.taskId, tasks.id), eq(sessions.userId, userId)))
        .where(and(eq(dailyPlans.date, today), eq(dailyPlans.userId, userId)))
        .groupBy(dailyPlans.id, tasks.title, tasks.estimatedMinutes, tasks.priority)
        .orderBy(dailyPlans.position);
    return result;
}

export async function updatePlanItemStatus(id: string, status: string, skipReason?: string, skipTrigger?: string) {
    const userId = await getScopedUserId();
    const updates: any = { status };
    if (skipReason) updates.skipReason = skipReason;
    if (skipTrigger) updates.skipTrigger = skipTrigger;
    
    // 1. Update the daily plan item
    const updatedPlan = await db.update(dailyPlans).set(updates).where(and(eq(dailyPlans.id, id), eq(dailyPlans.userId, userId))).returning();
    
    // 2. Sync to the underlying task if completing, but only if it's NOT a recurring task
    // and NOT a time slice (Option A: slices don't auto-complete the main task)
    if (updatedPlan.length > 0 && (status === 'done' || status === 'planned')) {
        const planItem = updatedPlan[0];
        const taskRows = await db.select({ 
            type: tasks.type,
            estimatedMinutes: tasks.estimatedMinutes 
        }).from(tasks).where(and(eq(tasks.id, planItem.taskId!), eq(tasks.userId, userId)));
        
        if (taskRows.length > 0 && taskRows[0].type !== 'recurring') {
            const isSlice = planItem.allocatedMinutes && planItem.allocatedMinutes < (taskRows[0].estimatedMinutes || 0);
            
            // Map 'done' (PlanStatus) to 'completed' (TaskStatus)
            // Map 'planned' (PlanStatus) to 'pending' (TaskStatus)
            const targetStatus = status === 'done' ? 'completed' : 'pending';
            
            // Only update task status if it's NOT a slice
            if (!isSlice) {
                await db.update(tasks).set({ status: targetStatus }).where(and(eq(tasks.id, planItem.taskId!), eq(tasks.userId, userId)));
            }
        }
    }
    
    revalidatePath("/");
}

export async function commitTodaysPlan() {
    const userId = await getScopedUserId();
    const today = localDateStr();
    await db
        .update(dailyPlans)
        .set({ committedAt: new Date() })
        .where(and(eq(dailyPlans.date, today), eq(dailyPlans.userId, userId)));
    revalidatePath("/");
}

/**
 * Persists a new task order for a given date's plan.
 * @param date      ISO date string (YYYY-MM-DD)
 * @param orderedIds  All plan item IDs for that date in the desired order (index 0 = position 1)
 */
export async function reorderPlanItems(date: string, orderedIds: string[]) {
    const userId = await getScopedUserId();
    await Promise.all(
        orderedIds.map((id, index) =>
            db.update(dailyPlans)
                .set({ position: index + 1 })
                .where(and(eq(dailyPlans.id, id), eq(dailyPlans.date, date), eq(dailyPlans.userId, userId)))
        )
    );
    revalidatePath("/");
}

export async function removePlanItem(id: string) {
    const userId = await getScopedUserId();
    await db.delete(dailyPlans).where(and(eq(dailyPlans.id, id), eq(dailyPlans.userId, userId)));
    revalidatePath("/");
}

export async function addPlanItem(taskId: string, tier: string = "target", allocatedMinutes?: number) {
    const userId = await getScopedUserId();
    const today = localDateStr();
    
    // Find the current max position for today's plan to append at the bottom
    const existingItems = await db.select({ position: dailyPlans.position }).from(dailyPlans).where(and(eq(dailyPlans.date, today), eq(dailyPlans.userId, userId)));
    const nextPosition = existingItems.length > 0 ? Math.max(...existingItems.map(i => i.position)) + 1 : 1;

    // Fetch task metadata for safety slice
    const taskRows = await db.select({ estimatedMinutes: tasks.estimatedMinutes }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const est = taskRows[0]?.estimatedMinutes || 0;
    
    let finalAllocation = allocatedMinutes;
    if (!finalAllocation && est > 60) {
        finalAllocation = 45; // Default 45m slice for large tasks added manually
    }

    const result = await db.insert(dailyPlans).values({
        userId,
        date: today,
        taskId,
        position: nextPosition,
        tier,
        status: "planned",
        allocatedMinutes: finalAllocation || null,
    }).returning();
    
    revalidatePath("/");
    return result[0];
}
