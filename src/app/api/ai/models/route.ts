import { NextResponse } from "next/server";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

export async function GET() {
    const results: { name: string; label: string; desc: string; source: string }[] = [];

    // 1. Check Ollama for local models
    try {
        const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            signal: AbortSignal.timeout(2000),
        });

        if (res.ok) {
            const data = await res.json();
            for (const m of (data.models || [])) {
                results.push({
                    name: m.name,
                    label: `${m.name} (Local)`,
                    desc: `${(m.size / 1e9).toFixed(1)}GB · Offline`,
                    source: "ollama",
                });
            }
        }
    } catch {
        // Ollama offline — not an error, just skip
    }

    // 2. Add Groq cloud models if key is set
    if (GROQ_API_KEY) {
        const groqModels = [
            { name: "llama-3.1-8b-instant", label: "Llama 3.1 · 8B (Groq Cloud)", desc: "Fast · Free · Recommended" },
            { name: "llama-3.3-70b-versatile", label: "Llama 3.3 · 70B (Groq Cloud)", desc: "Best quality · Free" },
            { name: "gemma2-9b-it", label: "Gemma 2 · 9B (Groq Cloud)", desc: "Google · Free" },
        ];
        for (const m of groqModels) {
            results.push({ ...m, source: "groq" });
        }
    }

    if (results.length === 0) {
        return NextResponse.json({
            models: [],
            error: "No AI backend available. Either start Ollama (`ollama serve`) or add GROQ_API_KEY to .env.local (free at https://console.groq.com/keys).",
        });
    }

    return NextResponse.json({ models: results });
}
