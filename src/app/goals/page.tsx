import { getTasks, getGoals } from "@/app/actions";
import DatabaseView from "./DatabaseView";
import { auth } from "@clerk/nextjs/server";

export default async function GoalsPage() {
    const { userId } = await auth();
    if (!userId) {
        return <div className="text-zinc-300">Sign in to access your goals.</div>;
    }

    const tasks = await getTasks();
    const goals = await getGoals();
    
    return (
        <div className="flex flex-col w-full animate-in fade-in duration-300">
            <DatabaseView initialTasks={tasks as any[]} initialGoals={goals as any[]} />
        </div>
    );
}