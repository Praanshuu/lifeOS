import { getTasks, getGoals } from "@/app/actions";
import DatabaseView from "./DatabaseView";

export default async function GoalsPage() {
    const tasks = await getTasks();
    const goals = await getGoals();
    
    return (
        <div className="flex flex-col w-full animate-in fade-in duration-300">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Database</h1>
                <p className="text-zinc-500 text-sm">Manage tasks, goals, and execution metrics.</p>
            </div>
            
            <DatabaseView initialTasks={tasks as any[]} initialGoals={goals as any[]} />
        </div>
    );
}