import { NextRequest, NextResponse } from "next/server";
import { generateTaskBreakdown } from "@/lib/planner/breakdown";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { taskId, title, goalId, dueDate, guidance } = body;

        if (!taskId || !title || !guidance) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const result = await generateTaskBreakdown(taskId, title, goalId, dueDate, guidance);

        return NextResponse.json({ success: true, count: result.count });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
