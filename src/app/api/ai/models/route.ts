import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAvailableModels } from "@/lib/ai/client";

export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const models = await getAvailableModels();

    if (models.length === 0) {
        return NextResponse.json({
            models: [],
            error: "No AI backend available. Add OPENROUTER_API_KEY to .env.local (OpenRouter), or GROQ_API_KEY, or run local Ollama (`ollama serve`).",
        });
    }

    return NextResponse.json({ models });
}
