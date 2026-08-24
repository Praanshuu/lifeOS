// Quick test: OpenRouter (Nemotron 3 Super) + Groq + Ollama connectivity
// Run: node src/test-ai.mjs

import fs from "fs";

let env = {};
try {
    const envFile = fs.readFileSync(".env.local", "utf-8");
    envFile.split("\n").forEach(line => {
        const [k, ...v] = line.split("=");
        if (k && v.length) env[k.trim()] = v.join("=").trim();
    });
} catch {}

const OPENROUTER_KEY = env.OPENROUTER_API_KEY || env.OPENROUTER_NEMOTRON_3_SUPER_API_KEY || process.env.OPENROUTER_API_KEY || "";
const GROQ_KEY = env.GROQ_API_KEY || process.env.GROQ_API_KEY || "";
const OLLAMA_URL = env.OLLAMA_BASE_URL || process.env.OLLAMA_BASE_URL || "http://localhost:11434";

async function testOpenRouter() {
    console.log("\n=== Testing OpenRouter (NVIDIA Nemotron 3 Super) ===");
    if (!OPENROUTER_KEY) {
        console.log("⚠️  No OPENROUTER_API_KEY or OPENROUTER_NEMOTRON_3_SUPER_API_KEY found in .env.local");
        return;
    }
    console.log("   Key found:", OPENROUTER_KEY.slice(0, 10) + "...");
    
    try {
        const model = env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";
        console.log("   Calling model:", model);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENROUTER_KEY}`,
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "LifeOS",
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: "Reply with 'LifeOS Nemotron Ready' and 1 tip for high-leverage focus." }],
                max_tokens: 200,
                temperature: 0.2,
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
            throw new Error(`OpenRouter status ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        const choice = data.choices?.[0]?.message;
        console.log("✅ OpenRouter responded:\n", choice?.content || "(Reasoning only): " + choice?.reasoning?.slice(0, 100));
    } catch (e) {
        console.log("❌ OpenRouter FAILED:", e.message);
    }
}

async function testGroq() {
    console.log("\n=== Testing Groq ===");
    if (!GROQ_KEY) {
        console.log("⚠️  No GROQ_API_KEY found in .env.local");
        return;
    }
    console.log("   Key found:", GROQ_KEY.slice(0, 8) + "...");
    
    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: "Say hello in 5 words." }],
                max_tokens: 30,
                temperature: 0.2,
            }),
            signal: AbortSignal.timeout(15000),
        });
        
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Status ${res.status}: ${err}`);
        }
        
        const data = await res.json();
        console.log("✅ Groq responded:", data.choices?.[0]?.message?.content?.slice(0, 100));
    } catch (e) {
        console.log("❌ Groq FAILED:", e.message);
    }
}

async function testOllama() {
    console.log("\n=== Testing Ollama ===");
    try {
        const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const models = (data.models || []).map(m => m.name);
        console.log("✅ Ollama is RUNNING");
        console.log("   Models:", models.join(", ") || "none installed");
    } catch (e) {
        console.log("⚠️  Ollama not running (offline):", e.message);
    }
}

(async () => {
    await testOpenRouter();
    await testGroq();
    await testOllama();
    console.log("\n=== Done ===\n");
})();
