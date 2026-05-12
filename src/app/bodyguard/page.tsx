import { assembleContext } from "@/lib/context";
import BodyguardClient from "./BodyguardClient";
import { Shield } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
    title: "AI Bodyguard — LifeOS",
    description: "Your Radical Truth-Teller. Full access to your goals, tasks, and session history.",
};

export default async function BodyguardPage() {
    const { userId } = await auth();
    if (!userId) {
        return <div className="text-zinc-300">Sign in to use AI Bodyguard.</div>;
    }

    const context = await assembleContext(userId, ["goals", "tasks", "patterns"], 14);
    
    const patterns = context.patterns as any;
    const tasks = context.tasks as any;

    const commitmentScore = patterns?.commitmentScore ?? 0;
    const totalFocusHours = patterns?.totalFocusHours ?? 0;
    const pendingHighPriority = tasks?.highPriorityPendingCount ?? 0;

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-5 px-1 py-2">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
                    <Shield className="w-5 h-5 text-cyan-500" />
                </div>
                <div className="space-y-0.5">
                    <h1 className="text-xl font-bold tracking-tight text-zinc-100">AI Bodyguard</h1>
                    <p className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider">Radical Truth-Teller · Autonomous Agent</p>
                </div>
            </div>

            <BodyguardClient
                commitmentScore={commitmentScore}
                totalFocusHours={totalFocusHours}
                pendingHighPriority={pendingHighPriority}
            />
        </div>
    );
}
