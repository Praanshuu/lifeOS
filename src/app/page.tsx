import TaskDashboard from "@/components/TaskDashboard";
import { AiBanner } from "@/components/AiBanner";
import { getTasks, getSessionsForToday, getGoals, getTodaysPlan } from "./actions";
import { computeNudges } from "@/lib/nudges";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="text-zinc-300">Sign in to load your dashboard.</div>;
  }

  const [tasks, sessions, goals, plan] = await Promise.all([
    getTasks(),
    getSessionsForToday(),
    getGoals(),
    getTodaysPlan(),
  ]);

  const nudges = computeNudges(tasks as any[], sessions as any[]);

  return (
    <div className="flex flex-col w-full pb-24">
      <TaskDashboard 
        initialTasks={tasks as any[]} 
        initialSessions={sessions as any[]} 
        initialGoals={goals as any[]}
        initialPlan={plan as any[]}
        nudges={nudges}
      />
    </div>
  );
}


