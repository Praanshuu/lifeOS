import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { localDateStr } from "@/lib/utils";
import { callAI, type AITool } from "@/lib/ai/client";

const GENERATE_SUBTASKS_TOOL: AITool = {
    type: "function",
    function: {
        name: "generate_micro_tasks",
        description: "Generate daily micro-tasks to accomplish a large goal or parent task.",
        parameters: {
            type: "object",
            required: ["subtasks"],
            properties: {
                subtasks: {
                    type: "array",
                    items: {
                        type: "object",
                        required: ["title", "estimatedMinutes", "scheduledDate"],
                        properties: {
                            title: { type: "string", description: "Clear, actionable title of the micro-task" },
                            estimatedMinutes: { type: "number", description: "Realistic time estimate in minutes (e.g. 30, 45, 60)" },
                            scheduledDate: { type: "string", description: "ISO Date string (YYYY-MM-DD) when this task should be done" }
                        }
                    }
                }
            }
        }
    }
};

export async function generateTaskBreakdown(
    userId: string,
    parentTaskId: string,
    parentTitle: string,
    goalId: string | null,
    dueDate: string | null,
    guidance: string
) {
    const today = localDateStr();

    const parentRows = await db
        .select({
            title: tasks.title,
            goalId: tasks.goalId,
            dueDate: tasks.dueDate,
        })
        .from(tasks)
        .where(and(eq(tasks.id, parentTaskId), eq(tasks.userId, userId)))
        .limit(1);

    if (parentRows.length === 0) {
        throw new Error("Parent task not found.");
    }
    const parentTask = parentRows[0];
    
    // Deduplication Guard: Delete any existing micro-tasks for this parent
    await db.delete(tasks).where(and(eq(tasks.parentTaskId, parentTaskId), eq(tasks.userId, userId)));
    
    const context = {
        today,
        parentTitle: parentTask.title || parentTitle,
        dueDate: (parentTask.dueDate ? new Date(parentTask.dueDate).toISOString().split("T")[0] : dueDate) || "No strict deadline",
        userGuidance: guidance
    };

    const SYSTEM_PROMPT = `You are the LifeOS Micro-Task Breakdown Engine.
Your job is to take a monolithic parent task and break it down into realistic, sequential daily micro-tasks.
Follow the user's guidance strictly (e.g., pace, chapters, phases).
Ensure scheduled dates progress chronologically starting from today (${today}) and do not exceed the deadline (if provided).
Assign realistic estimatedMinutes (e.g., 30–60 min per daily chunk).
Call the generate_micro_tasks tool exactly once with the array of subtasks.`;

    const aiRes = await callAI({
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Context:\n${JSON.stringify(context, null, 2)}\n\nBreak this down!` }
        ],
        tools: [GENERATE_SUBTASKS_TOOL],
        toolChoice: { type: "function", function: { name: "generate_micro_tasks" } },
        maxTokens: 2048,
        temperature: 0.2,
    });

    const toolCall = aiRes.tool_calls?.[0];
    if (!toolCall) {
        throw new Error("AI failed to return structured subtasks.");
    }

    const args = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;

    const subtasks = args.subtasks || [];

    if (subtasks.length > 0) {
        await db.insert(tasks).values(
            subtasks.map((st: any) => ({
                userId,
                title: st.title,
                parentTaskId: parentTaskId,
                goalId: parentTask.goalId || goalId || null,
                estimatedMinutes: st.estimatedMinutes || 30,
                scheduledDate: new Date(st.scheduledDate),
                dueDate: new Date(st.scheduledDate),
                priority: "medium",
                type: "one-off",
            }))
        );
    }

    return { success: true, count: subtasks.length };
}
