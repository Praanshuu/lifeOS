import { assembleContext } from "@/lib/context";
import BodyguardClient from "./BodyguardClient";
import { Shield, Sparkles } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
    title: "AI Bodyguard — LifeOS",
    description: "Your Autonomous Strategic Reality-Checker and AI Mentor.",
};

export default async function BodyguardPage() {
    const { userId } = await auth();
    if (!userId) {
        return (
            <div className="flex items-center justify-center h-[50vh] text-zinc-400 font-mono text-sm">
                Sign in to access AI Bodyguard.
            </div>
        );
    }

    const context = await assembleContext(userId, ["goals", "tasks", "patterns"], 14);
    
    const patterns = context.patterns as any;
    const tasks = context.tasks as any;

    const commitmentScore = patterns?.commitmentScore ?? 0;
    const totalFocusHours = patterns?.totalFocusHours ?? 0;
    const pendingHighPriority = tasks?.highPriorityPendingCount ?? 0;

    return (
        <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-950/30">
                        <Shield className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-bold tracking-tight text-zinc-100">AI Bodyguard & Mentor</h1>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                Nemotron 3 Super
                            </span>
                        </div>
                        <p className="text-zinc-500 text-xs font-medium tracking-normal mt-0.5">
                            Objective Reality-Checker · Strategic Planning · Goal Momentum
                        </p>
                    </div>
                </div>
            </div>

            <BodyguardClient
                commitmentScore={commitmentScore}
                totalFocusHours={totalFocusHours}
                pendingHighPriority={pendingHighPriority}
                contextData={context}
            />
        </div>
    );
}
