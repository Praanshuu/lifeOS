import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const GENERATE_SUBTASKS_TOOL = {
    type: "function" as const,
    function: {
        name: "generate_micro_tasks",
        description: "Generate daily micro-tasks to accomplish a large goal.",
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

export async function generateTaskBreakdown(parentTaskId: string, parentTitle: string, goalId: string | null, dueDate: string | null, guidance: string) {
    const today = new Date().toISOString().split("T")[0];
    
    // ─── Deduplication Guard ─────────────────────────────────────────────────────
    // Delete any existing micro-tasks that were previously generated for this parent.
    // This mirrors the daily planner's regenerate pattern — always start fresh.
    await db.delete(tasks).where(eq(tasks.parentTaskId, parentTaskId));
    
    const context = {
        today,
        parentTitle,
        dueDate: dueDate || "No strict deadline",
        userGuidance: guidance
    };

    const SYSTEM_PROMPT = `You are a micro-task breakdown engine.
Your job is to take a monolithic high-level task and break it down into actionable daily micro-tasks.
Follow the user's guidance strictly. If they say '1 chapter a day', generate tasks for each chapter across sequential days.
Use the current date to start scheduling. Ensure the dates progress chronologically and do not exceed the deadline (if provided).
Call the generate_micro_tasks tool exactly once with the array of subtasks.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Context:\n${JSON.stringify(context, null, 2)}\n\nBreak this down!` }
            ],
            tools: [GENERATE_SUBTASKS_TOOL],
            tool_choice: { type: "function", function: { name: "generate_micro_tasks" } },
            max_tokens: 2048,
            temperature: 0.2,
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to generate breakdown: " + await response.text());
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
        throw new Error("AI failed to return subtasks.");
    }

    const args = JSON.parse(toolCall.function.arguments);
    const subtasks = args.subtasks || [];

    if (subtasks.length > 0) {
        await db.insert(tasks).values(
            subtasks.map((st: any) => ({
                title: st.title,
                parentTaskId: parentTaskId,
                goalId: goalId || null,
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
