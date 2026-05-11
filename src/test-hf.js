const token = process.env.HF_API_TOKEN || process.env.HF_TOKEN;

async function testModel(model) {
    try {
        const res = await fetch("https://router.huggingface.co/hf-inference/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: "Hi" }],
                max_tokens: 10
            })
        });
        
        const text = await res.text();
        console.log(`[${model}] Status: ${res.status} | Response: ${text.substring(0, 100)}`);
    } catch (e) {
        console.error(`[${model}] Error:`, e.message);
    }
}

async function main() {
    await testModel("Qwen/Qwen2.5-7B-Instruct");
    await testModel("meta-llama/Llama-3.2-3B-Instruct");
    await testModel("mistralai/Mistral-7B-Instruct-v0.3");
    await testModel("microsoft/Phi-3.5-mini-instruct");
}

main();
