import { pgTable, uuid, text, integer, timestamp, date, boolean, AnyPgColumn } from "drizzle-orm/pg-core";

// Activities table (Breaks, Distractions, Lunch)
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "break", "distraction"
  isSystem: boolean("is_system").default(true),
});

// Tasks table (Intentional work)
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  status: text("status").default("pending"),
  type: text("type").default("one-off"), // "one-off" or "recurring"
  recurrenceRule: text("recurrence_rule"), // e.g., "daily", "weekdays", "weekly"
  priority: text("priority").default("medium"),
  estimatedMinutes: integer("estimated_minutes").default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
  energyLevel: text("energy_level"),
  anticipatedFriction: text("anticipated_friction"),
  tags: text("tags").array(),
  goalId: uuid("goal_id").references(() => goals.id, {
    onDelete: "cascade",
  }),
  parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, {
    onDelete: "cascade",
  }),
});

// Goals table
export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  importance: integer("importance").default(1),
  logicalReason: text("logical_reason"),
  emotionalReason: text("emotional_reason"),
  deadline: timestamp("deadline", { withTimezone: true }),
  status: text("status").default("active"),
});

// Sessions table (Actual behavior)
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().default("focus"), // "focus", "break", "distraction"
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  activityId: uuid("activity_id").references(() => activities.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { withTimezone: true }).defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  interruptions: integer("interruptions").default(0),
  frictionLog: text("friction_log"),
});

// Day logs table
export const dayLogs = pgTable("day_logs", {
  date: date("date").primaryKey(),
  rating: integer("rating"),
  reflection: text("reflection"),
  commitment: integer("commitment"),
});

// Daily Plans table (AI-generated daily priority stack)
export const dailyPlans = pgTable("daily_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  tier: text("tier").notNull().default("target"), // 'minimum' | 'target' | 'stretch' | 'refresh'
  rationale: text("rationale"),
  status: text("status").notNull().default("planned"), // 'planned' | 'done' | 'skipped' | 'blocked'
  skipReason: text("skip_reason"),
  skipTrigger: text("skip_trigger"), // 'avoidance', 'burnout', 'distraction', 'energy', etc.
  committedAt: timestamp("committed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});