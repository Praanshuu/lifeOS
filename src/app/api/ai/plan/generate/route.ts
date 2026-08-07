import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateDailyPlan } from "@/lib/planner/engine";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const dateStr = body.date as string | undefined;
        const intention = body.intention as string | undefined;
        const capacityOverride = typeof body.capacityOverrideMinutes === "number" ? body.capacityOverrideMinutes : undefined;
        const date = dateStr ? new Date(dateStr) : new Date();

        const result = await generateDailyPlan(userId, date, intention, capacityOverride);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        revalidatePath("/");
        return NextResponse.json({
            success: true,
            scheduledTasks: result.count,
            dailyCapacityMinutes: result.dailyCapacityMinutes,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
