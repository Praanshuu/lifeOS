// Quick test: Ollama + Groq connectivity
// Run: node src/test-ai.mjs

const OLLAMA_URL = "http://localhost:11434";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

async function testOllama() {
    console.log("\n=== Testing Ollama ===");
    try {
        const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const models = (data.models || []).map(m => m.name);
        console.log("✅ Ollama is RUNNING");
        console.log("   Models:", models.join(", ") || "none installed");
        
        // Quick chat test
        console.log("   Sending test message...");
        const chat = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: models[0] || "qwen2.5-coder:latest",
                messages: [{ role: "user", content: "Say hello in 5 words." }],
                stream: false,
                options: { temperature: 0.2 }
            }),
            signal: AbortSignal.timeout(30000)
        });
        const chatData = await chat.json();
        console.log("✅ Ollama responded:", chatData.message?.content?.slice(0, 100));
    } catch (e) {
        console.log("❌ Ollama FAILED:", e.message);
    }
}

async function testGroq() {
    console.log("\n=== Testing Groq ===");
    
    // Read .env.local manually
    const fs = await import("fs");
    let apiKey = GROQ_API_KEY;
    try {
        const envFile = fs.readFileSync(".env.local", "utf-8");
        const match = envFile.match(/GROQ_API_KEY=(.+)/);
        if (match) apiKey = match[1].trim();
    } catch {}
    
    if (!apiKey) {
        console.log("⚠️  No GROQ_API_KEY found in .env.local");
        return;
    }
    console.log("   Key found:", apiKey.slice(0, 8) + "...");
    
    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: "Say hello in 5 words." }],
                max_tokens: 30,
                temperature: 0.2
            }),
            signal: AbortSignal.timeout(15000)
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

(async () => {
    await testOllama();
    await testGroq();
    console.log("\n=== Done ===\n");
})();
