import { db } from "@/db";
import { dailyPlans, tasks, sessions } from "@/db/schema";
import { gte, eq, isNotNull, and, sql } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BehaviourContext {
    /** How often the user actually completes items in each tier (0–100). */
    completionRateByTier: {
        minimum: number;
        target: number;
        stretch: number;
    };
    /**
     * Median ratio of actual spent time vs estimated time.
     * > 1.0 means the user consistently underestimates.
     * e.g. 1.4 = tasks take 40% longer than estimated on average.
     */
    avgSessionVsEstimateRatio: number;
    /** Top blocker reasons, ordered by frequency. */
    topBlockerReasons: string[];
    /** Top emotional triggers for skipping tasks, ordered by frequency. */
    topSkipTriggers: string[];
    /** Skip rate per task priority level (0–100). */
    skipRateByPriority: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    /**
     * Median single-session length in minutes.
     * Indicates how long the user can sustain focus in one sitting.
     */
    typicalFocusWindowMinutes: number;
    /** Number of daily plan days analysed (data coverage indicator). */
    sampleDays: number;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

function completionRate(items: { status: string }[]): number {
    if (items.length === 0) return 100; // no data → don't penalise
    const done = items.filter(i => i.status === "done").length;
    return Math.round((done / items.length) * 100);
}

function skipRate(items: { status: string }[]): number {
    if (items.length === 0) return 0;
    const skipped = items.filter(i => i.status === "skipped").length;
    return Math.round((skipped / items.length) * 100);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function buildBehaviourContext(userId: string, days = 30): Promise<BehaviourContext> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    const sinceStr = since.toISOString().split("T")[0];

    // 1. Fetch all historical plan items in the window, joined with task metadata
    const planItems = await db
        .select({
            id: dailyPlans.id,
            date: dailyPlans.date,
            tier: dailyPlans.tier,
            status: dailyPlans.status,
            skipReason: dailyPlans.skipReason,
            skipTrigger: dailyPlans.skipTrigger,
            estimatedMinutes: tasks.estimatedMinutes,
            taskPriority: tasks.priority,
            // Sum of all session minutes for this task
            spentMinutes: sql<number>`COALESCE(
                SUM(EXTRACT(EPOCH FROM (${sessions.endTime} - ${sessions.startTime})) / 60)
                FILTER (WHERE ${sessions.endTime} IS NOT NULL),
                0
            )`.mapWith(Number),
        })
        .from(dailyPlans)
        .leftJoin(tasks, eq(dailyPlans.taskId, tasks.id))
        .leftJoin(sessions, eq(sessions.taskId, tasks.id))
        .where(and(eq(dailyPlans.userId, userId), gte(dailyPlans.date, sinceStr)))
        .groupBy(
            dailyPlans.id,
            dailyPlans.date,
            dailyPlans.tier,
            dailyPlans.status,
            dailyPlans.skipReason,
            dailyPlans.skipTrigger,
            tasks.estimatedMinutes,
            tasks.priority,
        );

    // 2. Fetch raw session durations for focus window analysis
    const rawSessions = await db
        .select({
            startTime: sessions.startTime,
            endTime: sessions.endTime,
        })
        .from(sessions)
        .where(and(eq(sessions.userId, userId), gte(sessions.startTime, since), isNotNull(sessions.endTime)));

    const sampleDays = new Set(planItems.map(p => p.date)).size;

    // ── Completion rate by tier ───────────────────────────────────────────────
    const byTier = {
        minimum: planItems.filter(p => p.tier === "minimum"),
        target:  planItems.filter(p => p.tier === "target"),
        stretch: planItems.filter(p => p.tier === "stretch"),
    };

    const completionRateByTier = {
        minimum: completionRate(byTier.minimum),
        target:  completionRate(byTier.target),
        stretch: completionRate(byTier.stretch),
    };

    // ── Estimate accuracy ratio ───────────────────────────────────────────────
    // Only meaningful for items that were actually worked on
    const workedItems = planItems.filter(
        p => p.spentMinutes > 0 && (p.estimatedMinutes ?? 0) > 0
    );
    const ratios = workedItems.map(p => p.spentMinutes / (p.estimatedMinutes ?? 30));
    const avgSessionVsEstimateRatio = Math.round(median(ratios) * 100) / 100;

    // ── Top skip reasons ───────────────────────────────────────────────────
    const blockerCounts: Record<string, number> = {};
    const triggerCounts: Record<string, number> = {};
    for (const p of planItems) {
        if (p.skipReason) {
            blockerCounts[p.skipReason] = (blockerCounts[p.skipReason] ?? 0) + 1;
        }
        if (p.skipTrigger) {
            triggerCounts[p.skipTrigger] = (triggerCounts[p.skipTrigger] ?? 0) + 1;
        }
    }
    const topBlockerReasons = Object.entries(blockerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason]) => reason);
        
    const topSkipTriggers = Object.entries(triggerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([trigger]) => trigger);

    // ── Skip rate by priority ─────────────────────────────────────────────────
    const priorities = ["critical", "high", "medium", "low"] as const;
    const skipRateByPriority = Object.fromEntries(
        priorities.map(p => [
            p,
            skipRate(planItems.filter(i => i.taskPriority === p)),
        ])
    ) as BehaviourContext["skipRateByPriority"];

    // ── Typical focus window ──────────────────────────────────────────────────
    const sessionLengths = rawSessions
        .filter(s => s.endTime && s.startTime)
        .map(s => (new Date(s.endTime!).getTime() - new Date(s.startTime!).getTime()) / 60000)
        .filter(m => m > 2 && m < 240); // ignore noise (< 2 min) and outliers (> 4 hr)

    const typicalFocusWindowMinutes = Math.round(median(sessionLengths));

    return {
        completionRateByTier,
        avgSessionVsEstimateRatio,
        topBlockerReasons,
        topSkipTriggers,
        skipRateByPriority,
        typicalFocusWindowMinutes,
        sampleDays,
    };
}

