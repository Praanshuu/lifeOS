import { assembleContext } from "@/lib/context";
import BodyguardClient from "./BodyguardClient";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
    title: "AI Bodyguard & Mentor — LifeOS",
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

    return (
        <div className="w-full flex-1 flex flex-col animate-in fade-in duration-300">
            <BodyguardClient contextData={context} />
        </div>
    );
}
