export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'skipped' | 'blocked';
export type PlanTier = 'minimum' | 'target' | 'stretch' | 'refresh';
export type PlanStatus = 'planned' | 'done' | 'skipped' | 'blocked';

export interface DailyPlanItem {
    id: string;
    date: string;
    taskId: string;
    taskTitle: string;
    estimatedMinutes: number;
    allocatedMinutes: number | null;
    spentMinutes: number;
    priority: string;
    position: number;
    tier: PlanTier;
    rationale: string | null;
    status: PlanStatus;
    skipReason: string | null;
    skipTrigger: string | null;
    committedAt: string | null;
}

export interface Goal {
    id: string;
    title: string;
    importance: number;
    logicalReason: string | null;
    emotionalReason: string | null;
    deadline: Date | null;
    status: 'active' | 'achieved' | 'archived';
}

export interface Task {
    id: string;
    goalId?: string | null;
    parentTaskId?: string | null;
    parentTaskTitle?: string | null;
    title: string;
    status: TaskStatus;
    category?: 'work' | 'break' | 'distraction' | null;
    estimatedMinutes: number;
    priority: 'high' | 'medium' | 'low';
    dueDate: Date | null;
    scheduledDate?: Date | null;
    recurrenceRule?: string | null;
    energyLevel?: string | null;
    anticipatedFriction?: string | null;
    tags?: string[] | null;
    spentMinutes?: number;
}