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
    let openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_NEMOTRON_3_SUPER_API_KEY || "";
    
    // Safety check in case dotenv parsed with whitespace in key name
    if (!openRouterKey) {
        for (const [k, v] of Object.entries(process.env)) {
            if (k.trim().toUpperCase().startsWith("OPENROUTER") && v) {
                openRouterKey = v.trim();
                break;
            }
        }
    }
    openRouterKey = openRouterKey.trim();

    let openRouterModel = (process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free").trim();

    let groqKey = (process.env.GROQ_API_KEY || "").trim();
    let groqModel = (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim();

    let ollamaUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").trim();
    let ollamaModel = (process.env.OLLAMA_DEFAULT_MODEL || "qwen2.5-coder:latest").trim();

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
            label: "NVIDIA Nemotron 3 Super 120B",
            desc: "Primary · Advanced Reasoning · Free",
            source: "openrouter",
        });
    }

    // 2. Groq Cloud (Secondary - only if key is set)
    if (config.groqKey) {
        results.push({
            name: config.groqModel || "llama-3.3-70b-versatile",
            label: "Groq Cloud (Fast Fallback)",
            desc: "Ultra Fast · Cloud Fallback",
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
// Unified AI Dispatcher with Automatic Fallback
// ──────────────────────────────────────────────

export async function callAI(options: AICallOptions): Promise<AICallResponse> {
    const config = getAIConfig();
    const requestedModel = (options.model || "").trim();

    // 1. Primary: OpenRouter
    if (config.openRouterKey) {
        // If requested model belongs to OpenRouter or default
        const targetModel = (requestedModel && requestedModel.includes("/")) 
            ? requestedModel 
            : config.openRouterModel;
        try {
            return await callOpenRouter(config.openRouterKey, targetModel, options);
        } catch (openRouterErr) {
            console.warn("[AI] OpenRouter failed, attempting fallback...", openRouterErr);
            if (!config.groqKey) throw openRouterErr;
        }
    }

    // 2. Fallback: Groq
    if (config.groqKey) {
        const targetModel = (!requestedModel || requestedModel.includes("/"))
            ? config.groqModel
            : requestedModel;
        try {
            return await callGroq(config.groqKey, targetModel, options);
        } catch (groqErr) {
            console.warn("[AI] Groq failed, attempting Ollama fallback...", groqErr);
            // If OpenRouter is available, try OpenRouter as fallback
            if (config.openRouterKey) {
                return await callOpenRouter(config.openRouterKey, config.openRouterModel, options);
            }
            // Otherwise check Ollama
        }
    }

    // 3. Fallback: Ollama Local
    const ollamaOnline = await isOllamaRunning(config.ollamaUrl);
    if (ollamaOnline) {
        const targetModel = requestedModel && !requestedModel.includes("/") && !requestedModel.startsWith("llama")
            ? requestedModel
            : config.ollamaModel;
        return callOllama(config.ollamaUrl, targetModel, options);
    }

    throw new Error(
        "No AI provider is reachable. Please verify your OPENROUTER_API_KEY in .env.local or check your connection."
    );
}
