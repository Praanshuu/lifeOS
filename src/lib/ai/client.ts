export interface AIMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
            name: string;
            arguments: string;
        };
    }>;
}

export interface AITool {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface AICallOptions {
    messages: AIMessage[];
    tools?: AITool[];
    toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
    maxTokens?: number;
    temperature?: number;
    model?: string;
    signal?: AbortSignal;
}

export interface AICallResponse {
    content: string | null;
    reasoning?: string;
    tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
            name: string;
            arguments: string;
        };
    }>;
    backend: "openrouter" | "groq" | "ollama";
    model: string;
}

export interface ModelOption {
    name: string;
    label: string;
    desc: string;
    source: "openrouter" | "groq" | "ollama";
}

// ──────────────────────────────────────────────
// Configuration & Environment Variables
// ──────────────────────────────────────────────

export function getAIConfig() {
    const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_NEMOTRON_3_SUPER_API_KEY || "";
    const openRouterModel = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";

    const groqKey = process.env.GROQ_API_KEY || "";
    const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const ollamaModel = process.env.OLLAMA_DEFAULT_MODEL || "qwen2.5-coder:latest";

    return {
        openRouterKey,
        openRouterModel,
        groqKey,
        groqModel,
        ollamaUrl,
        ollamaModel,
    };
}

// ──────────────────────────────────────────────
// Health & Availability Checks
// ──────────────────────────────────────────────

export async function isOllamaRunning(url?: string): Promise<boolean> {
    const baseUrl = url || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    try {
        const res = await fetch(`${baseUrl}/api/tags`, {
            signal: AbortSignal.timeout(2000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function getAvailableModels(): Promise<ModelOption[]> {
    const config = getAIConfig();
    const results: ModelOption[] = [];

    // 1. OpenRouter (Primary)
    if (config.openRouterKey) {
        results.push({
            name: config.openRouterModel,
            label: "NVIDIA Nemotron 3 Super 120B (OpenRouter)",
            desc: "Primary · Advanced Reasoning · Free",
            source: "openrouter",
        });
    }

    // 2. Groq Cloud (Secondary)
    if (config.groqKey) {
        results.push({
            name: "llama-3.3-70b-versatile",
            label: "Llama 3.3 · 70B (Groq Cloud)",
            desc: "Fast Inference · Free",
            source: "groq",
        });
        results.push({
            name: "llama-3.1-8b-instant",
            label: "Llama 3.1 · 8B (Groq Cloud)",
            desc: "Ultra Fast · Lightweight",
            source: "groq",
        });
    }

    // 3. Ollama (Local)
    try {
        const res = await fetch(`${config.ollamaUrl}/api/tags`, {
            signal: AbortSignal.timeout(2000),
        });
        if (res.ok) {
            const data = await res.json();
            for (const m of data.models || []) {
                results.push({
                    name: m.name,
                    label: `${m.name} (Local)`,
                    desc: `${(m.size / 1e9).toFixed(1)}GB · Offline`,
                    source: "ollama",
                });
            }
        }
    } catch {
        // Ollama offline — skip
    }

    return results;
}

// ──────────────────────────────────────────────
// Backend Implementations
// ──────────────────────────────────────────────

async function callOpenRouter(
    apiKey: string,
    model: string,
    options: AICallOptions
): Promise<AICallResponse> {
    const { messages, tools, toolChoice, maxTokens = 2048, temperature = 0.2, signal } = options;

    const payload: Record<string, unknown> = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
    };

    if (tools && tools.length > 0) {
        payload.tools = tools;
        if (toolChoice) {
            payload.tool_choice = toolChoice;
        }
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "LifeOS",
        },
        body: JSON.stringify(payload),
        signal: signal || AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice || !choice.message) {
        throw new Error("Empty response from OpenRouter");
    }

    const msg = choice.message;
    return {
        content: msg.content ?? null,
        reasoning: msg.reasoning ?? choice.message?.reasoning_details?.[0]?.text,
        tool_calls: msg.tool_calls || undefined,
        backend: "openrouter",
        model,
    };
}

async function callGroq(
    apiKey: string,
    model: string,
    options: AICallOptions
): Promise<AICallResponse> {
    const { messages, tools, toolChoice, maxTokens = 2048, temperature = 0.2, signal } = options;

    const payload: Record<string, unknown> = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
    };

    if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = toolChoice || "auto";
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: signal || AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice || !choice.message) {
        throw new Error("Empty response from Groq");
    }

    const msg = choice.message;
    return {
        content: msg.content ?? null,
        tool_calls: msg.tool_calls || undefined,
        backend: "groq",
        model,
    };
}

async function callOllama(
    baseUrl: string,
    model: string,
    options: AICallOptions
): Promise<AICallResponse> {
    const { messages, tools, maxTokens, temperature = 0.2, signal } = options;

    const payload: Record<string, unknown> = {
        model,
        messages,
        stream: false,
        options: {
            temperature,
            ...(maxTokens ? { num_predict: maxTokens } : {}),
        },
    };

    if (tools && tools.length > 0) {
        payload.tools = tools;
    }

    const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: signal || AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const msg = data.message;
    if (!msg) {
        throw new Error("Empty response from Ollama");
    }

    return {
        content: msg.content ?? null,
        tool_calls: msg.tool_calls || undefined,
        backend: "ollama",
        model,
    };
}

// ──────────────────────────────────────────────
// Unified AI Dispatcher
// ──────────────────────────────────────────────

export async function callAI(options: AICallOptions): Promise<AICallResponse> {
    const config = getAIConfig();
    const requestedModel = options.model;

    // Check if user requested a specific model that matches a known provider format
    if (requestedModel) {
        if (requestedModel.includes("/") && config.openRouterKey) {
            return callOpenRouter(config.openRouterKey, requestedModel, options);
        }
        if ((requestedModel.startsWith("llama") || requestedModel.startsWith("gemma") || requestedModel.startsWith("mixtral")) && config.groqKey) {
            return callGroq(config.groqKey, requestedModel, options);
        }
    }

    // Default priority: OpenRouter (Primary) -> Groq (Fallback) -> Ollama (Local)
    if (config.openRouterKey) {
        const targetModel = requestedModel || config.openRouterModel;
        return callOpenRouter(config.openRouterKey, targetModel, options);
    }

    if (config.groqKey) {
        const targetModel = requestedModel || config.groqModel;
        return callGroq(config.groqKey, targetModel, options);
    }

    const ollamaOnline = await isOllamaRunning(config.ollamaUrl);
    if (ollamaOnline) {
        const targetModel = requestedModel || config.ollamaModel;
        return callOllama(config.ollamaUrl, targetModel, options);
    }

    throw new Error(
        "No AI provider available. Please set OPENROUTER_API_KEY (or OPENROUTER_NEMOTRON_3_SUPER_API_KEY) in .env.local, or set GROQ_API_KEY, or run local Ollama."
    );
}
