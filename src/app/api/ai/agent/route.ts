import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { assembleContext, type ContextModule } from "@/lib/context";
import { AGENT_TOOLS, type ToolName } from "@/lib/agent/tools";
import { executeTool } from "@/lib/agent/executor";
import {
    SYSTEM_PROMPT_BODYGUARD,
    SYSTEM_PROMPT_GOAL_PLANNER,
    SYSTEM_PROMPT_CHAT,
} from "@/lib/agent/prompts";
import { callAI, type AIMessage, type AITool } from "@/lib/ai/client";

type AgentMode = "weekly-report" | "goal-planner" | "chat";

const MODE_CONFIG: Record<AgentMode, { prompt: string; modules: ContextModule[]; days: number }> = {
    "weekly-report": {
        prompt: SYSTEM_PROMPT_BODYGUARD,
        modules: ["goals", "sessions", "tasks", "patterns", "behaviour"],
        days: 14,
    },
    "goal-planner": {
        prompt: SYSTEM_PROMPT_GOAL_PLANNER,
        modules: ["goals", "tasks", "sessions", "patterns"],
        days: 14,
    },
    "chat": {
        prompt: SYSTEM_PROMPT_CHAT,
        modules: ["goals", "tasks", "sessions", "patterns", "behaviour"],
        days: 7,
    },
};

// ──────────────────────────────────────────────
// Text-based tool call extractor (fallback for models
// that write inline JSON instead of tool_calls)
// ──────────────────────────────────────────────
async function extractAndExecuteTextToolCalls(userId: string, text: string): Promise<{
    cleanText: string;
    actionsExecuted: string[];
}> {
    const actionsExecuted: string[] = [];
    const stripped = text.replace(/<tools>[\s\S]*?<\/tools>/g, "").trim();

    const jsonPattern = /\{\s*"name"\s*:\s*"(\w+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/g;
    let match;
    const toExecute: Array<{ name: string; args: Record<string, unknown> }> = [];

    while ((match = jsonPattern.exec(text)) !== null) {
        try {
            const name = match[1] as ToolName;
            const args = JSON.parse(match[2]);
            const validTools = ["create_task", "update_task", "delete_task", "create_goal", "suggest_system_improvement", "start_activity_session"];
            if (validTools.includes(name)) {
                toExecute.push({ name, args });
            }
        } catch { /* Skip malformed JSON */ }
    }

    for (const tc of toExecute) {
        const result = await executeTool(userId, tc.name as ToolName, tc.args);
        if (result.success) {
            actionsExecuted.push(`✓ ${result.message}`);
        }
    }

    const cleanText = stripped
        .replace(jsonPattern, "")
        .replace(/```json[\s\S]*?```/g, "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    return { cleanText, actionsExecuted };
}

// ──────────────────────────────────────────────
// Trim context to keep payload bounded & high signal
// ──────────────────────────────────────────────
function formatStructuredContext(ctx: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    if (ctx.goals) {
        const goals = ctx.goals as any[];
        out.goals = goals.slice(0, 10).map((g: any) => ({
            id: g.id,
            title: g.title,
            importance: g.importance,
            logicalReason: g.logicalReason,
            emotionalReason: g.emotionalReason,
            status: g.status,
            deadline: g.deadline,
            daysLeft: g.daysUntilDeadline,
            progress: g.progress,
            pendingTasks: g.pendingTasks,
            isStagnant: g.isStagnant,
            daysSinceLastSession: g.daysSinceLastSession,
        }));
    }

    if (ctx.tasks) {
        const t = ctx.tasks as any;
        out.tasks = {
            total: t.totalTasks,
            done: t.completedCount,
            overdue: t.overdueCount,
            highPriorityPending: t.highPriorityPendingCount,
            pending: (t.pending as any[]).slice(0, 30).map((p: any) => ({
                id: p.id,
                title: p.title,
                priority: p.priority,
                type: p.type,
                status: p.status,
                due: p.dueDate,
                est: p.estimatedMinutes,
                spent: p.spentMinutes,
                remaining: p.remainingMinutes,
                friction: p.anticipatedFriction,
                goal: p.goal,
                parent: p.parentTask,
            })),
            compositeTasks: (t.compositeTasks as any[] || []).map((c: any) => ({
                id: c.id,
                title: c.title,
                goal: c.goal,
            })),
        };
    }

    if (ctx.sessions) {
        const s = ctx.sessions as any;
        out.sessions = {
            avgFocusMin: s.avgDailyFocusMinutes,
            todayFocusMin: s.todayFocusMinutes,
            todayBreakMin: s.todayBreakMinutes,
            todayDistractionMin: s.todayDistractionMinutes,
            recentDays: (s.dailySummaries as any[]).slice(-5).map((d: any) => ({
                date: d.date,
                focusMin: d.totalMinutes,
                breakMin: d.breakMinutes,
                distractionMin: d.distractionMinutes,
                contextSwitches: d.contextSwitches,
            })),
        };
    }

    if (ctx.patterns) {
        const p = ctx.patterns as any;
        out.patterns = {
            commitmentScore: p.commitmentScore,
            avgSessionLengthMinutes: p.avgSessionLengthMinutes,
            peakHour: p.peakHour,
            mostProductiveDay: p.mostProductiveDay,
            highPriorityFocusPercent: p.highPriorityFocusPercent,
        };
    }

    if (ctx.behaviour) {
        const b = ctx.behaviour as any;
        out.behaviour = {
            completionRateByTier: b.completionRateByTier,
            avgSessionVsEstimateRatio: b.avgSessionVsEstimateRatio,
            topBlockerReasons: b.topBlockerReasons,
            topSkipTriggers: b.topSkipTriggers,
            typicalFocusWindowMinutes: b.typicalFocusWindowMinutes,
        };
    }

    return out;
}

// ──────────────────────────────────────────────
// Main POST handler
// ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            mode = "chat",
            message,
            model,
            history = [],
        }: {
            mode: AgentMode;
            message: string;
            model?: string;
            history?: Array<{ role: "user" | "assistant"; content: string }>;
        } = body;

        const config = MODE_CONFIG[mode] || MODE_CONFIG.chat;

        // ── 1. Assemble full LifeOS context ──
        const rawContext = await assembleContext(userId, config.modules, config.days);
        const structuredContext = formatStructuredContext(rawContext);
        const contextJson = JSON.stringify(structuredContext);

        const userMessage = message || (mode === "weekly-report" ? "Generate my performance report." : "Hello");

        // ── 2. Construct bounded conversation messages ──
        // LifeOS Context + recent conversation -> model
        const boundedHistory = (history || [])
            .slice(-10) // Retain up to last 10 turns
            .filter(m => m && m.content && (m.role === "user" || m.role === "assistant"))
            .map(m => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            }));

        const messages: AIMessage[] = [
            { role: "system", content: config.prompt },
            { role: "system", content: `CURRENT LIFEOS DATA CONTEXT:\n<context>${contextJson}</context>` },
            ...boundedHistory,
            { role: "user", content: userMessage },
        ];

        // ── 3. Agentic execution loop (up to 6 rounds) ──
        let rounds = 0;
        let finalText = "";
        let usedBackend = "openrouter";
        let usedModel = "";

        while (rounds < 6) {
            rounds++;
            let aiResponse;
            try {
                aiResponse = await callAI({
                    messages,
                    tools: AGENT_TOOLS as AITool[],
                    toolChoice: "auto",
                    maxTokens: 2048,
                    temperature: 0.3,
                    model: model || undefined,
                });
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                console.error(`[AI Agent Error on round ${rounds}]:`, errMsg);

                // Retry once without tools if schema validation failed
                if (errMsg.includes("tool") || errMsg.includes("validation")) {
                    aiResponse = await callAI({
                        messages,
                        maxTokens: 2048,
                        temperature: 0.3,
                        model: model || undefined,
                    });
                } else {
                    throw err;
                }
            }

            usedBackend = aiResponse.backend;
            usedModel = aiResponse.model;

            const toolCalls = aiResponse.tool_calls;
            if (toolCalls && toolCalls.length > 0) {
                // Record assistant's tool call invocation
                messages.push({
                    role: "assistant",
                    content: aiResponse.content,
                    tool_calls: toolCalls,
                });

                // Execute each tool call
                for (const tc of toolCalls) {
                    const toolName = tc.function.name as ToolName;
                    const toolArgs = typeof tc.function.arguments === "string"
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments;

                    const result = await executeTool(userId, toolName, toolArgs);

                    messages.push({
                        role: "tool",
                        tool_call_id: tc.id,
                        name: toolName,
                        content: JSON.stringify(result),
                    });
                }
                continue;
            }

            // No tool calls → final answer obtained
            finalText = aiResponse.content || "";
            if (!finalText && rounds < 6) {
                continue;
            }
            break;
        }

        // ── 4. Fallback text tool extraction (if model output JSON in text) ──
        let actionsExecuted: string[] = [];
        if (finalText) {
            const extracted = await extractAndExecuteTextToolCalls(userId, finalText);
            finalText = extracted.cleanText;
            actionsExecuted = extracted.actionsExecuted;
        }

        if (actionsExecuted.length > 0) {
            finalText += `\n\n---\n**Actions executed:**\n${actionsExecuted.join("\n")}`;
        }

        if (!finalText) {
            finalText = "The AI completed processing but returned no text. Try refining your request.";
        }

        return NextResponse.json({
            response: finalText,
            rounds,
            backend: usedBackend,
            model: usedModel,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AI Agent Route Error]:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
