import { buildGoalsContext } from "./goals.context";
import { buildSessionsContext } from "./sessions.context";
import { buildTasksContext } from "./tasks.context";
import { buildPatternsContext } from "./patterns.context";
import { buildBehaviourContext } from "./behaviour.context";

export type ContextModule = "goals" | "sessions" | "tasks" | "patterns" | "behaviour";

export async function assembleContext(
    modules: ContextModule[] = ["goals", "sessions", "tasks", "patterns"],
    days = 14
) {
    const context: Record<string, unknown> = {};

    await Promise.all([
        modules.includes("goals")     && buildGoalsContext().then(d => { context.goals = d; }),
        modules.includes("sessions")  && buildSessionsContext(days).then(d => { context.sessions = d; }),
        modules.includes("tasks")     && buildTasksContext().then(d => { context.tasks = d; }),
        modules.includes("patterns")  && buildPatternsContext(days).then(d => { context.patterns = d; }),
        modules.includes("behaviour") && buildBehaviourContext(30).then(d => { context.behaviour = d; }),
    ]);

    return context;
}
