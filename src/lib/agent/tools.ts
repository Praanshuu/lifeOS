export const AGENT_TOOLS = [
    {
        type: "function" as const,
        function: {
            name: "create_task",
            description: "Creates a new task in the user's LifeOS system. Use this when the user asks to add a task, or when decomposing a goal into actionable steps.",
            parameters: {
                type: "object",
                required: ["title", "priority", "estimatedMinutes"],
                properties: {
                    title: {
                        type: "string",
                        description: "A clear, action-oriented task title starting with a verb (e.g., 'Build authentication module')"
                    },
                    priority: {
                        type: "string",
                        enum: ["low", "medium", "high", "critical"],
                        description: "Task urgency and impact level"
                    },
                    estimatedMinutes: {
                        type: "number",
                        description: "Realistic time estimate in minutes to complete the task"
                    },
                    goalId: {
                        type: "string",
                        description: "ID of the associated goal. Only set if the user has mentioned a specific goal."
                    },
                    scheduledDate: {
                        type: "string",
                        description: "ISO date string (YYYY-MM-DD) to schedule this task. Use today's date if the task should start now."
                    },
                    type: {
                        type: "string",
                        enum: ["one-off", "recurring"],
                        description: "Task type. Use 'one-off' for standard tasks, 'recurring' for habits or daily routines."
                    }
                }
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "start_activity_session",
            description: "Starts a session for a system activity like taking a break or being distracted. NEVER use create_task for breaks or distractions.",
            parameters: {
                type: "object",
                required: ["activityType"],
                properties: {
                    activityType: {
                        type: "string",
                        enum: ["break", "distraction"],
                        description: "The type of activity to start"
                    }
                }
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "update_task",
            description: "Updates an existing task's status, priority, or due date. Use this when the user wants to change a task.",
            parameters: {
                type: "object",
                required: ["id"],
                properties: {
                    id: {
                        type: "string",
                        description: "The exact task ID to update"
                    },
                    status: {
                        type: "string",
                        enum: ["pending", "in-progress", "completed", "skipped", "rescheduled"]
                    },
                    priority: {
                        type: "string",
                        enum: ["low", "medium", "high", "critical"]
                    },
                    estimatedMinutes: {
                        type: "number"
                    },
                    dueDate: {
                        type: "string",
                        description: "New due date as ISO string (YYYY-MM-DD)"
                    }
                }
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "delete_task",
            description: "Permanently deletes a task. ONLY use this when the user explicitly and unambiguously asks to delete or remove a task.",
            parameters: {
                type: "object",
                required: ["id"],
                properties: {
                    id: {
                        type: "string",
                        description: "The exact task ID to delete"
                    }
                }
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "create_goal",
            description: "Creates a new long-term goal. Use when the user describes a major objective, project, or ambition.",
            parameters: {
                type: "object",
                required: ["title"],
                properties: {
                    title: {
                        type: "string",
                        description: "The goal title, concise and outcome-focused"
                    },
                    deadline: {
                        type: "string",
                        description: "Target completion date as ISO string (YYYY-MM-DD)"
                    }
                }
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "suggest_system_improvement",
            description: "Records a meta-suggestion about a feature or tracking capability that would improve the user's LifeOS system. Use this when you identify a gap in data that would make your analysis more accurate.",
            parameters: {
                type: "object",
                required: ["suggestion", "rationale"],
                properties: {
                    suggestion: {
                        type: "string",
                        description: "The suggested feature or tracking improvement"
                    },
                    rationale: {
                        type: "string",
                        description: "Why this would improve the system's effectiveness"
                    }
                }
            }
        }
    }
];

export type ToolName = "create_task" | "update_task" | "delete_task" | "create_goal" | "suggest_system_improvement" | "start_activity_session";
