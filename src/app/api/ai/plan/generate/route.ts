import { NextRequest, NextResponse } from "next/server";
import { generateDailyPlan } from "@/lib/planner/engine";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const dateStr = body.date as string | undefined;
        const intention = body.intention as string | undefined;
        const date = dateStr ? new Date(dateStr) : new Date();

        const result = await generateDailyPlan(date, intention);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, scheduledTasks: result.count });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
