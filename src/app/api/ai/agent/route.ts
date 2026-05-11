import { NextRequest, NextResponse } from "next/server";
import { assembleContext, type ContextModule } from "@/lib/context";
import { AGENT_TOOLS, type ToolName } from "@/lib/agent/tools";
import { executeTool } from "@/lib/agent/executor";
import {
    SYSTEM_PROMPT_BODYGUARD,
    SYSTEM_PROMPT_GOAL_PLANNER,
    SYSTEM_PROMPT_CHAT,
} from "@/lib/agent/prompts";

// ──────────────────────────────────────────────
// Config — read once at startup
// ──────────────────────────────────────────────
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_DEFAULT_MODEL || "qwen2.5-coder:latest";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

type AgentMode = "weekly-report" | "goal-planner" | "chat";

const MODE_CONFIG: Record<AgentMode, { prompt: string; modules: ContextModule[]; days: number }> = {
    "weekly-report": {
        prompt: SYSTEM_PROMPT_BODYGUARD,
        modules: ["goals", "sessions", "tasks", "patterns"],
        days: 14,
    },
    "goal-planner": {
        prompt: SYSTEM_PROMPT_GOAL_PLANNER,
        modules: ["goals", "tasks", "patterns"],
        days: 14,
    },
    "chat": {
        prompt: SYSTEM_PROMPT_CHAT,
        modules: ["goals", "tasks", "sessions"],
        days: 7,
    },
};

// ──────────────────────────────────────────────
// Backend: Ollama (local)
// ──────────────────────────────────────────────
async function callOllama(model: string, messages: object[], tools: object[]) {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            messages,
            tools: tools.length > 0 ? tools : undefined,
            stream: false,
            options: { temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Ollama error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.message;
}

async function isOllamaRunning(): Promise<boolean> {
    try {
        const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            signal: AbortSignal.timeout(2000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

// ──────────────────────────────────────────────
// Backend: Groq (cloud — free, fast, reliable)
// Get your free key: https://console.groq.com/keys
// ──────────────────────────────────────────────
async function callGroq(model: string, messages: object[], tools: object[]) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            messages,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? "auto" : undefined,
            max_tokens: 1536,
            temperature: 0.5,
            stream: false,
        }),
        signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0]?.message;
    if (!choice) throw new Error("Empty response from Groq");

    return choice;
}

// ──────────────────────────────────────────────
// Text-based tool call extractor (fallback for models
// that write JSON instead of structured function calls)
// ──────────────────────────────────────────────
async function extractAndExecuteTextToolCalls(text: string): Promise<{
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
            const validTools = ["create_task", "update_task", "delete_task", "create_goal", "suggest_system_improvement"];
            if (validTools.includes(name)) {
                toExecute.push({ name, args });
            }
        } catch { /* Skip malformed JSON */ }
    }

    for (const tc of toExecute) {
        const result = await executeTool(tc.name as ToolName, tc.args);
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
// Trim context to keep payload under ~3k tokens
// ──────────────────────────────────────────────
function trimContext(ctx: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    if (ctx.goals) {
        const goals = ctx.goals as any[];
        // Increase goal visibility to 10
        out.goals = goals.slice(0, 10).map((g: any) => ({
            id: g.id,
            title: g.title,
            status: g.status,
            deadline: g.deadline,
            daysLeft: g.daysUntilDeadline,
            progress: g.progress,
        }));
    }

    if (ctx.tasks) {
        const t = ctx.tasks as any;
        out.tasks = {
            total: t.totalTasks,
            done: t.completedCount,
            overdue: t.overdueCount,
            // Increase task visibility to 25 to capture micro-tasks
            pending: (t.pending as any[]).slice(0, 25).map((p: any) => ({
                id: p.id,
                title: p.title,
                priority: p.priority,
                status: p.status,
                due: p.dueDate,
                est: p.estimatedMinutes,
                goal: p.goal,
                parent: p.parentTask, // Include parent task title for context
            })),
            // Include composite tasks (parents) so the AI sees the big picture
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
            days: (s.dailySummaries as any[]).slice(-3).map((d: any) => ({
                date: d.date,
                min: d.totalMinutes,
            })),
        };
    }

    return out;
}


// ──────────────────────────────────────────────
// Main POST handler
// ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
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
            history?: Array<{ role: string; content: string }>;
        } = body;

        // ── Determine which backend to use ──
        // Priority: Groq (fast cloud) → Ollama (local offline) → error
        const ollamaAvailable = await isOllamaRunning();
        let backend: "ollama" | "groq";
        let activeModel: string;

        if (GROQ_API_KEY) {
            backend = "groq";
            activeModel = GROQ_MODEL;
            console.log(`[AI] Using Groq (${activeModel})`);
        } else if (ollamaAvailable) {
            backend = "ollama";
            activeModel = model || OLLAMA_MODEL;
            console.log(`[AI] Using Ollama (${activeModel})`);
        } else {
            return NextResponse.json({
                error: "No AI backend available.\n\n" +
                    "**Option A (Cloud — recommended):** Add a free Groq API key to `.env.local`:\n" +
                    "1. Go to https://console.groq.com/keys\n" +
                    "2. Create a free key\n" +
                    "3. Add `GROQ_API_KEY=gsk_...` to `.env.local`\n" +
                    "4. Restart the dev server\n\n" +
                    "**Option B (Local):** Start Ollama → run `ollama serve` in a terminal.",
            }, { status: 503 });
        }

        const config = MODE_CONFIG[mode];

        // ── Build context ──
        const rawContext = await assembleContext(config.modules, config.days);
        const context = trimContext(rawContext);

        const userMessage = message || "Generate the report.";
        const cappedMessage = userMessage;

        const cappedContext = JSON.stringify(context);


        const trimmedHistory = history.slice(-4);
        const userContent = `${cappedMessage}\n\n<context>${cappedContext}</context>`;

        const baseMessages: object[] = [
            { role: "system", content: config.prompt },
            ...trimmedHistory,
            { role: "user", content: userContent },
        ];

        // ── LLM caller — picks the active backend, with Groq fallback on timeout ──
        const callLLM = async (msgs: object[], tools: object[]) => {
            if (backend === "groq") return callGroq(activeModel, msgs, tools);

            // Ollama path — if it times out and Groq is available, fall back
            try {
                return await callOllama(activeModel, msgs, tools);
            } catch (ollamaErr) {
                const msg = ollamaErr instanceof Error ? ollamaErr.message : String(ollamaErr);
                if (GROQ_API_KEY && (msg.includes("timeout") || msg.includes("aborted"))) {
                    console.warn("[AI] Ollama timed out → falling back to Groq");
                    backend = "groq";
                    activeModel = GROQ_MODEL;
                    return callGroq(activeModel, msgs, tools);
                }
                throw ollamaErr;
            }
        };

        // ── Agentic loop (max 6 rounds) ──
        const toolHistory: object[] = [];
        let finalText = "";
        let rounds = 0;

        while (rounds < 6) {
            rounds++;
            const allMessages = [...baseMessages, ...toolHistory];

            let responseMessage: any;
            try {
                responseMessage = await callLLM(allMessages, AGENT_TOOLS);
            } catch (e) {
                const errMsg = e instanceof Error ? e.message : String(e);
                console.error(`[AI] ${backend} error:`, errMsg);

                // If tools caused the error, retry without tools
                if (errMsg.includes("tool") || errMsg.includes("function") || errMsg.includes("validation")) {
                    console.warn("[AI] Retrying without tools...");
                    responseMessage = await callLLM(allMessages, []);
                } else {
                    throw e;
                }
            }

            // If model wants to call tools
            if (responseMessage.tool_calls?.length > 0) {
                // Build history-safe version: arguments MUST be strings for the API
                const historyToolCalls = responseMessage.tool_calls.map((tc: any) => ({
                    ...tc,
                    function: {
                        ...tc.function,
                        arguments: typeof tc.function.arguments === "string"
                            ? tc.function.arguments
                            : JSON.stringify(tc.function.arguments),
                    },
                }));

                toolHistory.push({
                    role: "assistant",
                    content: responseMessage.content || null,
                    tool_calls: historyToolCalls,
                });

                for (const tc of responseMessage.tool_calls) {
                    const toolName = tc.function.name as ToolName;
                    // Parse arguments if they're still a string
                    const toolArgs = typeof tc.function.arguments === "string"
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments;
                    const result = await executeTool(toolName, toolArgs);

                    toolHistory.push({
                        role: "tool",
                        ...(tc.id ? { tool_call_id: tc.id } : {}),
                        name: toolName,
                        content: JSON.stringify(result),
                    });
                }

                continue;
            }

            // No tool calls — this is the final response
            finalText = responseMessage.content || "";
            if (!finalText) {
                console.warn("[AI] Empty response on round", rounds);
                if (rounds < 6) continue;
                finalText = "The model returned an empty response. Try a shorter or simpler request.";
            }
            break;
        }

        // Scan final text for any inline JSON tool calls
        let actionsExecuted: string[] = [];
        if (finalText) {
            const extracted = await extractAndExecuteTextToolCalls(finalText);
            finalText = extracted.cleanText;
            actionsExecuted = extracted.actionsExecuted;
        }

        if (actionsExecuted.length > 0) {
            finalText += `\n\n---\n**Actions executed:**\n${actionsExecuted.join("\n")}`;
        }

        return NextResponse.json({
            response: finalText,
            rounds,
            backend,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AI Error]", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
