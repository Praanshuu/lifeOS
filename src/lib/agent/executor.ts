import { db } from "@/db";
import { tasks, goals, activities, sessions } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import type { ToolName } from "./tools";

export interface ToolResult {
    success: boolean;
    message: string;
    data?: unknown;
}

export const systemSuggestions: Array<{ suggestion: string; rationale: string; timestamp: string }> = [];

export async function executeTool(name: ToolName, args: Record<string, unknown>): Promise<ToolResult> {
    try {
        switch (name) {
            case "create_task": {
                const newTask = await db.insert(tasks).values({
                    title: args.title as string,
                    priority: (args.priority as string) || "medium",
                    estimatedMinutes: (args.estimatedMinutes as number) || 30,
                    goalId: (args.goalId as string) || null,
                    scheduledDate: args.scheduledDate ? new Date(args.scheduledDate as string) : null,
                    type: (args.type as string) || "one-off",
                    status: "pending",
                }).returning({ id: tasks.id, title: tasks.title });

                return {
                    success: true,
                    message: `Task created: "${newTask[0].title}"`,
                    data: newTask[0],
                };
            }

            case "start_activity_session": {
                const activityType = args.activityType as string;
                
                // Find the activity by type
                const existingActivities = await db.select()
                    .from(activities)
                    .where(eq(activities.type, activityType))
                    .limit(1);
                
                if (existingActivities.length === 0) {
                    return {
                        success: false,
                        message: `Could not find an activity mapping for type "${activityType}".`
                    };
                }

                const activity = existingActivities[0];

                const newSession = await db.insert(sessions).values({
                    type: activityType,
                    activityId: activity.id,
                    startTime: new Date(),
                }).returning({ id: sessions.id });

                return {
                    success: true,
                    message: `Started session for activity: "${activity.name}"`,
                    data: { sessionId: newSession[0].id }
                };
            }

            case "update_task": {
                // Verify task exists before updating
                const existing = await db.select({ id: tasks.id, title: tasks.title })
                    .from(tasks).where(eq(tasks.id, args.id as string));

                if (existing.length === 0) {
                    return { success: false, message: `No task found with id "${args.id}". Cannot update.` };
                }

                const updates: Record<string, unknown> = {};
                if (args.status) updates.status = args.status;
                if (args.priority) updates.priority = args.priority;
                if (args.estimatedMinutes) updates.estimatedMinutes = args.estimatedMinutes;
                if (args.dueDate) updates.dueDate = new Date(args.dueDate as string);
                if (args.title) updates.title = args.title;

                if (Object.keys(updates).length === 0) {
                    return { success: false, message: "No valid fields to update were provided." };
                }

                await db.update(tasks).set(updates).where(eq(tasks.id, args.id as string));
                return { success: true, message: `Task "${existing[0].title}" updated successfully.` };
            }

            case "delete_task": {
                // SAFETY: verify the task exists by ID first
                const existing = await db.select({ id: tasks.id, title: tasks.title })
                    .from(tasks).where(eq(tasks.id, args.id as string));

                if (existing.length === 0) {
                    // If ID-based lookup fails, check if maybe a title was passed instead
                    if (args.title) {
                        const byTitle = await db.select({ id: tasks.id, title: tasks.title })
                            .from(tasks).where(ilike(tasks.title, `%${args.title as string}%`));

                        if (byTitle.length === 0) {
                            return {
                                success: false,
                                message: `No task found matching "${args.title}". Nothing was deleted.`,
                            };
                        }
                        if (byTitle.length > 1) {
                            const list = byTitle.map(t => `"${t.title}"`).join(", ");
                            return {
                                success: false,
                                message: `Multiple tasks match "${args.title}": ${list}. Please specify which one.`,
                            };
                        }
                        // Exactly one match — safe to delete
                        await db.delete(tasks).where(eq(tasks.id, byTitle[0].id));
                        return { success: true, message: `Task "${byTitle[0].title}" deleted.` };
                    }

                    return {
                        success: false,
                        message: `No task found with id "${args.id}". Nothing was deleted.`,
                    };
                }

                await db.delete(tasks).where(eq(tasks.id, existing[0].id));
                return { success: true, message: `Task "${existing[0].title}" deleted.` };
            }

            case "create_goal": {
                const newGoal = await db.insert(goals).values({
                    title: args.title as string,
                    deadline: args.deadline ? new Date(args.deadline as string) : null,
                    status: "active",
                }).returning({ id: goals.id, title: goals.title });

                return {
                    success: true,
                    message: `Goal created: "${newGoal[0].title}"`,
                    data: newGoal[0],
                };
            }

            case "suggest_system_improvement": {
                systemSuggestions.push({
                    suggestion: args.suggestion as string,
                    rationale: args.rationale as string,
                    timestamp: new Date().toISOString(),
                });
                return {
                    success: true,
                    message: `System improvement recorded: "${args.suggestion}"`,
                    data: { suggestion: args.suggestion, rationale: args.rationale },
                };
            }

            default:
                return { success: false, message: `Unknown tool: ${name}` };
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `Tool execution failed: ${msg}` };
    }
}
