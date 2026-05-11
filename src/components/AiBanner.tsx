import Link from "next/link";
import { AlertTriangle, Clock, ArrowRight, Shield, CheckCircle } from "lucide-react";
import type { Nudge } from "@/lib/nudges";

const NUDGE_STYLES: Record<Nudge["type"], { bg: string; border: string; icon: React.ReactNode }> = {
    overdue: {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />,
    },
    intervention: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        icon: <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />,
    },
    "context-switch": {
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        icon: <ArrowRight className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />,
    },
    streak: {
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        icon: <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />,
    },
};

export function AiBanner({ nudges }: { nudges: Nudge[] }) {
    const hasNudges = nudges.length > 0;

    return (
        <div className="flex flex-col gap-2">
            {/* Always-visible AI status bar */}
            <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                hasNudges
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-zinc-900/60 border-zinc-800"
            }`}>
                <div className="flex items-center gap-2">
                    <Shield className={`w-3.5 h-3.5 ${hasNudges ? "text-amber-400" : "text-cyan-400"}`} />
                    <span className={`text-xs font-medium ${hasNudges ? "text-amber-300" : "text-zinc-400"}`}>
                        {hasNudges
                            ? `AI Bodyguard · ${nudges.length} alert${nudges.length > 1 ? "s" : ""} detected`
                            : "AI Bodyguard · All clear"}
                    </span>
                </div>
                <Link
                    href="/bodyguard"
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                >
                    Open Bodyguard
                    <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            {/* Nudge banners — only when there are alerts */}
            {nudges.map((nudge, i) => {
                const style = NUDGE_STYLES[nudge.type];
                return (
                    <div
                        key={i}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${style.bg} ${style.border}`}
                    >
                        {style.icon}
                        <span className="text-zinc-300">{nudge.message}</span>
                    </div>
                );
            })}
        </div>
    );
}

