import { db } from "@/db";
import { dailyPlans, tasks, sessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { assembleContext } from "@/lib/context";
import { SYSTEM_PROMPT_PLANNER } from "./prompts";
import { localDateStr } from "@/lib/utils";
import { callAI, type AIMessage, type AITool } from "@/lib/ai/client";

const SCHEDULE_TASK_TOOL: AITool = {
    type: "function",
    function: {
        name: "schedule_task",
        description: "Adds a task to today's daily plan with specific time allocation.",
        parameters: {
            type: "object",
            required: ["taskId", "position", "tier", "allocatedMinutes", "rationale"],
            properties: {
                taskId: { type: "string", description: "The exact task ID to schedule" },
                position: { type: "number", description: "Order in the stack (1 = first)" },
                tier: {
                    type: "string",
                    enum: ["minimum", "target", "stretch", "refresh"],
                    description: "The tier of this task in today's plan",
                },
                allocatedMinutes: {
                    type: "number",
                    description: "Required. Minutes allocated for this task TODAY based on remaining effort, priority, and daily capacity upper bound."
                },
                rationale: {
                    type: "string",
                    description: "One sentence explaining why this task was chosen and why this duration was allocated",
                },
            },
        },
    },
};

export interface CapacityAnalysis {
    dailyCapacityMinutes: number;
    baselineFocusMinutes: number;
    trend: "improving" | "stable" | "declining";
    burnoutSignal: boolean;
    progressiveAdjustmentMinutes: number;
    rationale: string;
}

export function estimateDailyCapacityDetails(rawContext: any, userIntention?: string): CapacityAnalysis {
    const sessions_ctx = rawContext.sessions as any;
    const tasks_ctx = rawContext.tasks as any;
    const goals_ctx = rawContext.goals as any;
    const behaviour_ctx = rawContext.behaviour as any;

    const dailySummaries = (sessions_ctx?.dailySummaries as any[]) || [];
    
    // 1. Calculate 7-day vs previous 7-day focus averages
    const sortedDays = [...dailySummaries].sort((a, b) => b.date.localeCompare(a.date));
    const last7 = sortedDays.slice(0, 7);
    const prev7 = sortedDays.slice(7, 14);

    const last7Avg = last7.length > 0 ? Math.round(last7.reduce((sum, d) => sum + (d.totalMinutes || 0), 0) / last7.length) : 0;
    const prev7Avg = prev7.length > 0 ? Math.round(prev7.reduce((sum, d) => sum + (d.totalMinutes || 0), 0) / prev7.length) : 0;

    let baseline = last7Avg > 0 ? last7Avg : (sessions_ctx?.avgDailyFocusMinutes && sessions_ctx.avgDailyFocusMinutes > 0 ? sessions_ctx.avgDailyFocusMinutes : 240);

    // 2. Trend analysis
    let trend: "improving" | "stable" | "declining" = "stable";
    if (prev7Avg > 0) {
        if (last7Avg >= prev7Avg * 1.15) trend = "improving";
        else if (last7Avg <= prev7Avg * 0.85) trend = "declining";
    }

    // 3. Burnout & overwork signals
    const topTriggers: string[] = behaviour_ctx?.topSkipTriggers || [];
    const minCompletion = behaviour_ctx?.completionRateByTier?.minimum ?? 100;
    const burnoutSignal = topTriggers.includes("burnout") || topTriggers.includes("energy") || minCompletion < 60;

    // 4. Progressive adjustment
    let progressiveAdjustmentMinutes = 0;
    if (burnoutSignal || trend === "declining") {
        // Recovery reduction: scale down by 15-25% (at least 30 mins)
        progressiveAdjustmentMinutes = -Math.max(30, Math.round(baseline * 0.2));
    } else if (trend === "improving" || minCompletion >= 85) {
        // Healthy consistency: modest progressive stretch nudge (+20 mins)
        progressiveAdjustmentMinutes = 20;
    }

    let calculated = baseline + progressiveAdjustmentMinutes;

    // 5. Workload & deadline pressure modifier
    const urgentGoals = (goals_ctx as any[])?.filter((g: any) => g.daysUntilDeadline !== null && g.daysUntilDeadline <= 3) || [];
    const urgentTasks = (tasks_ctx?.pending as any[])?.filter((t: any) => t.priority === "critical" || t.priority === "high") || [];

    if ((urgentGoals.length > 0 || urgentTasks.length >= 3) && !burnoutSignal) {
        calculated += 30; // modest bump for deadline pressure if no burnout
    }

    // 6. User intention modifier
    const lowerIntention = (userIntention || "").toLowerCase();
    if (lowerIntention.includes("light") || lowerIntention.includes("easy") || lowerIntention.includes("half day") || lowerIntention.includes("rest")) {
        calculated = Math.round(calculated * 0.65);
    } else if (lowerIntention.includes("heavy") || lowerIntention.includes("crunch") || lowerIntention.includes("full day") || lowerIntention.includes("push")) {
        calculated = Math.round(calculated * 1.3);
    }

    // 7. Clamp final capacity between 120m (2h) and 480m (8h), rounded to nearest 15m
    const finalCapacity = Math.min(480, Math.max(120, Math.round(calculated / 15) * 15));

    let rationale = `Baseline ${Math.round(baseline / 60 * 10) / 10}h based on recent ${last7.length || 14}-day history (${trend} trend).`;
    if (burnoutSignal) {
        rationale += ` Reduced by ${Math.abs(progressiveAdjustmentMinutes)}m for fatigue/recovery context.`;
    } else if (progressiveAdjustmentMinutes > 0) {
        rationale += ` Progressive nudge of +${progressiveAdjustmentMinutes}m added for healthy execution consistency.`;
    }

    return {
        dailyCapacityMinutes: finalCapacity,
        baselineFocusMinutes: baseline,
        trend,
        burnoutSignal,
        progressiveAdjustmentMinutes,
        rationale,
    };
}

export function estimateDailyCapacity(rawContext: any, userIntention?: string): number {
    return estimateDailyCapacityDetails(rawContext, userIntention).dailyCapacityMinutes;
}

export async function generateDailyPlan(
    userId: string,
    date: Date,
    userIntention?: string,
    capacityOverrideMinutes?: number
): Promise<{ success: boolean; count: number; dailyCapacityMinutes?: number; error?: string }> {
    const dateStr = localDateStr(date);

    // 1. Check if plan already exists for this date
    const existing = await db
        .select({ id: dailyPlans.id })
        .from(dailyPlans)
        .where(and(eq(dailyPlans.date, dateStr), eq(dailyPlans.userId, userId)));

    if (existing.length > 0) {
        // Delete existing plan to regenerate
        await db.delete(dailyPlans).where(and(eq(dailyPlans.date, dateStr), eq(dailyPlans.userId, userId)));
    }

    // 2. Assemble full context (behaviour uses a 30-day window for reliability)
    const rawContext = await assembleContext(userId, ["goals", "tasks", "sessions", "patterns", "behaviour"], 14);

    // 3. Extract typed slices & compute daily capacity analysis
    const tasks_ctx    = rawContext.tasks     as any;
    const sessions_ctx = rawContext.sessions  as any;
    const goals_ctx    = rawContext.goals     as any;
    const patterns_ctx = rawContext.patterns  as any;
    const behaviour_ctx = rawContext.behaviour as any;

    const capacityAnalysis = estimateDailyCapacityDetails(rawContext, userIntention);
    const dailyCapacityMinutes = capacityOverrideMinutes && capacityOverrideMinutes > 0
        ? capacityOverrideMinutes
        : capacityAnalysis.dailyCapacityMinutes;

    const todayFocusMinutes = sessions_ctx?.todayFocusMinutes ?? 0;
    const remainingCapacityMinutes = Math.max(0, dailyCapacityMinutes - todayFocusMinutes);

    const plannerContext = {
        today: {
            date: dateStr,
            workCompletedTodayMinutes: todayFocusMinutes,
            breakMinutesToday: sessions_ctx?.todayBreakMinutes ?? 0,
            distractionMinutesToday: sessions_ctx?.todayDistractionMinutes ?? 0,
            remainingCapacityMinutes,
            userIntention: userIntention || "No specific intention provided. Optimize for high-leverage goals and realistic momentum.",
        },
        capacity: {
            dailyCapacityMinutes,
            avgDailyFocusMinutes: sessions_ctx?.avgDailyFocusMinutes ?? 120,
            trend: capacityAnalysis.trend,
            burnoutSignal: capacityAnalysis.burnoutSignal,
            progressiveAdjustmentMinutes: capacityAnalysis.progressiveAdjustmentMinutes,
            rationale: capacityAnalysis.rationale,
            peakHour: patterns_ctx?.peakHour ?? null,
        },
        goals: (goals_ctx as any[])?.slice(0, 10).map((g: any) => ({
            id: g.id,
            title: g.title,
            importance: g.importance,
            logicalReason: g.logicalReason,
            emotionalReason: g.emotionalReason,
            daysLeft: g.daysUntilDeadline,
            progress: g.progress,
            pendingTasks: g.pendingTasks,
            isStagnant: g.isStagnant,
            daysSinceLastSession: g.daysSinceLastSession,
        })),
        pendingTasks: (tasks_ctx?.pending as any[])
            ?.slice(0, 40)
            .map((t: any) => ({
                id: t.id,
                title: t.title,
                priority: t.priority,
                type: t.type,
                anticipatedFriction: t.anticipatedFriction,
                estimatedMinutes: t.estimatedMinutes,
                spentMinutes: t.spentMinutes,
                remainingMinutes: t.remainingMinutes ?? Math.max(0, t.estimatedMinutes - t.spentMinutes),
                dueDate: t.dueDate,
                goal: t.goal,
                parentTask: t.parentTask || null,
            })),
        compositeTasks: (tasks_ctx?.compositeTasks as any[])?.slice(0, 15) ?? [],
        behaviour: {
            completionRateByTier:    behaviour_ctx?.completionRateByTier    ?? { minimum: 100, target: 100, stretch: 100 },
            avgSessionVsEstimateRatio: behaviour_ctx?.avgSessionVsEstimateRatio ?? 1.0,
            topBlockerReasons:       behaviour_ctx?.topBlockerReasons       ?? [],
            topSkipTriggers:         behaviour_ctx?.topSkipTriggers         ?? [],
            skipRateByPriority:      behaviour_ctx?.skipRateByPriority      ?? { critical: 0, high: 0, medium: 0, low: 0 },
            typicalFocusWindowMinutes: (behaviour_ctx?.typicalFocusWindowMinutes && behaviour_ctx.typicalFocusWindowMinutes > 0) ? behaviour_ctx.typicalFocusWindowMinutes : 45,
            sampleDays:              behaviour_ctx?.sampleDays              ?? 0,
        },
    };

    // 4. Call AI Dispatcher (Nemotron 3 Super / OpenRouter / Groq / Ollama)
    let iterCount = 0;
    const messages: AIMessage[] = [
        { role: "system", content: SYSTEM_PROMPT_PLANNER },
        { role: "user", content: `<context>${JSON.stringify(plannerContext)}</context>\n\nReason through the user's goals, constraints, and current state. Generate today's priority stack.` },
    ];

    let scheduledCount = 0;
    const scheduledTaskIds = new Set<string>();

    while (iterCount < 6) {
        iterCount++;
        let aiResponse;
        try {
            aiResponse = await callAI({
                messages,
                tools: [SCHEDULE_TASK_TOOL],
                toolChoice: "auto",
                maxTokens: 2048,
                temperature: 0.2,
            });
        } catch (err) {
            return { success: false, count: 0, error: `AI Planner error: ${err instanceof Error ? err.message : String(err)}` };
        }

        const toolCalls = aiResponse.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            // No more tool calls → AI completed scheduling
            break;
        }

        // Record assistant's message with tool calls
        messages.push({
            role: "assistant",
            content: aiResponse.content,
            tool_calls: toolCalls,
        });

        // Execute tool calls
        for (const tc of toolCalls) {
            const args = typeof tc.function.arguments === "string"
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments;

            if (tc.function.name === "schedule_task") {
                if (scheduledTaskIds.has(args.taskId)) {
                    messages.push({
                        role: "tool",
                        tool_call_id: tc.id,
                        name: "schedule_task",
                        content: JSON.stringify({ success: false, reason: "already_scheduled", message: "This task is already in the plan. Choose a different task or finish." }),
                    });
                    continue;
                }

                try {
                    const taskRows = await db
                        .select({ id: tasks.id, estimatedMinutes: tasks.estimatedMinutes })
                        .from(tasks)
                        .where(and(eq(tasks.id, args.taskId), eq(tasks.userId, userId)))
                        .limit(1);

                    if (taskRows.length === 0) {
                        messages.push({
                            role: "tool",
                            tool_call_id: tc.id,
                            name: "schedule_task",
                            content: JSON.stringify({ success: false, reason: "task_not_found", message: "Task not found for this user." }),
                        });
                        continue;
                    }

                    const est = taskRows[0].estimatedMinutes || 30;
                    const focusWindow = (behaviour_ctx?.typicalFocusWindowMinutes && behaviour_ctx.typicalFocusWindowMinutes > 0) ? behaviour_ctx.typicalFocusWindowMinutes : 45;

                    let finalAllocation = typeof args.allocatedMinutes === "number" && args.allocatedMinutes > 0
                        ? args.allocatedMinutes
                        : (args.tier === "refresh" ? Math.min(30, est) : Math.min(est, focusWindow));

                    await db.insert(dailyPlans).values({
                        userId,
                        date: dateStr,
                        taskId: args.taskId,
                        position: args.position,
                        tier: args.tier,
                        allocatedMinutes: Math.round(finalAllocation),
                        rationale: args.rationale,
                        status: "planned",
                    });

                    scheduledTaskIds.add(args.taskId);
                    scheduledCount++;

                    messages.push({
                        role: "tool",
                        tool_call_id: tc.id,
                        name: "schedule_task",
                        content: JSON.stringify({ success: true, message: `Scheduled task at position ${args.position} with ${Math.round(finalAllocation)}m allocated.` }),
                    });
                } catch (e) {
                    messages.push({
                        role: "tool",
                        tool_call_id: tc.id,
                        name: "schedule_task",
                        content: JSON.stringify({ success: false, error: String(e) }),
                    });
                }
            }
        }
    }

    return { success: true, count: scheduledCount, dailyCapacityMinutes };
}
