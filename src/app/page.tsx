import TaskDashboard from "@/components/TaskDashboard";
import { AiBanner } from "@/components/AiBanner";
import { getTasks, getSessionsForToday, getGoals, getTodaysPlan } from "./actions";
import { computeNudges } from "@/lib/nudges";

export default async function Home() {
  const tasks = await getTasks();
  const sessions = await getSessionsForToday();
  const goals = await getGoals();
  const plan = await getTodaysPlan();

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


