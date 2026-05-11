# Operational Systems Documentation: Home Dashboard

## SECTION 1 — PAGE PURPOSE

### System Overview
The Home Dashboard serves as the primary coordination layer of the Priority Manager platform. It is the operational interface where high-level strategic intent (Goals/Objectives) is translated into daily tactical execution (Daily Plans/Tasks) and verified through behavioral data (Sessions/Activities).

### Problem Statement
Users frequently experience a "planning-execution gap" where theoretical goals do not manifest in daily behavior. The Home Dashboard solves this by:
1.  **Reducing Choice Paralysis**: Narrowing the focus from the entire backlog to a "Committed Stack."
2.  **Enforcing Accountability**: Locking in a daily promise and measuring the integrity of that promise via the Commitment Score.
3.  **Surfacing Behavioral Divergence**: Visualizing the gap between planned focus and actual distractions in real-time.

### Usage Context
*   **Morning/Startup**: Users interact with the AI Planning system to curate their Daily Plan.
*   **Active Execution**: Users maintain the page as a persistent background/sidebar tab to trigger and monitor focus sessions.
*   **Reflection/Shutdown**: Users log final completions and provide qualitative feedback on blockers/skips.

### Success Criteria
*   **Behavioral**: Completion of "Non-Negotiable" tasks; high ratio of focus sessions vs. distractions.
*   **Systemic**: Integrity between `daily_plans.status` and actual `sessions` duration.
*   **Psychological**: Reduced cognitive load during transitions; increased self-trust through commitment consistency.

---

## SECTION 2 — FULL PAGE LAYOUT BREAKDOWN

### 1. Today's Stack (Center Column)
*   **UI Position**: Primary center-left area.
*   **Purpose**: Display the prioritized list of tasks for the current calendar date.
*   **Data Source**: `getTodaysPlan()` API call.
*   **Related Tables**: `daily_plans`, `tasks`.
*   **State Dependencies**: `isCommitted` (locks reordering), `isGenerating` (loading overlay).
*   **User Actions**: Reorder (drag/drop), Start Session, Mark Done, Skip/Block, Remove.
*   **Behavioral Purpose**: Visualizing the "promise" of the day.

### 2. AI Planner (Header Utility)
*   **UI Position**: Top right of the center column.
*   **Purpose**: Contextual generation of the daily plan.
*   **APIs**: `/api/ai/plan/generate`.
*   **AI Systems**: LLM-based planning engine (Groq/Ollama).
*   **User Actions**: Input "Intention" string, Trigger generation.
*   **Behavioral Purpose**: Outsourcing the cognitive cost of prioritization to the system.

### 3. Active Session Tracker (Persistent Sidebar)
*   **UI Position**: Right column, top widget.
*   **Purpose**: Real-time visualization of the current activity and elapsed time.
*   **Data Source**: `getSessionsForToday()`, filtered for `endTime IS NULL`.
*   **Related Tables**: `sessions`, `tasks`, `activities`.
*   **State Dependencies**: `activeTaskId`, `activeActivityId`.
*   **User Actions**: Stop Session.
*   **Behavioral Purpose**: Providing a visual "heartbeat" of active work to maintain focus.

### 4. Quick Activities (Sidebar Utility)
*   **UI Position**: Right column, middle.
*   **Purpose**: Rapid logging of non-task behavioral shifts.
*   **User Actions**: "Take Break", "Distraction".
*   **Related Tables**: `activities`, `sessions`.
*   **Behavioral Purpose**: Reducing the friction of logging "negative" behavior (distractions) to improve data honesty.

### 5. Manual Task Backlog (Inventory)
*   **UI Position**: Bottom of the center column, collapsible.
*   **Purpose**: Houses all actionable tasks that are not yet assigned to today's plan.
*   **Data Source**: Derived from `tasks` where `status != 'completed'` and `taskId` is not in `daily_plans` for today.
*   **User Actions**: "Add to Plan" (Target or Refresh tier), View Task Details.
*   **Behavioral Purpose**: Preventing cognitive overflow by separating the "Active Stack" from the "Infinite Backlog."

### 6. Reality Timeline (Sidebar Footer)
*   **UI Position**: Right column, bottom (collapsible).
*   **Purpose**: Visual comparison of time distribution.
*   **Data Source**: `sessions` array.
*   **Related Tables**: `sessions`.
*   **Behavioral Purpose**: Exposing "Time Blindness" by showing the actual chronological flow of the day.

---

## SECTION 3 — INTERACTION-LEVEL DOCUMENTATION

### 1. "Commit to Stack" Button
*   **User Intent**: Finalizing the daily plan and moving from "Planning Mode" to "Execution Mode."
*   **Database Changes**: `daily_plans.committedAt` set to `NOW()`.
*   **UI Updates**: Disables reordering, enables completion tracking, unlocks the "Commitment Score."
*   **Behavioral Problem**: Solves the "moving goalpost" syndrome where users keep adding tasks throughout the day to feel productive.

### 2. "Start/Stop" Toggle (Task Row)
*   **User Intent**: Initiating/concluding a focused work interval.
*   **Database Changes**: Inserts new row into `sessions` (on Start), updates `sessions.endTime` (on Stop).
*   **Analytics**: Logs duration and task context.
*   **Behavioral Problem**: Solves "Drift" by explicitly demarcating the beginning and end of intentional effort.

### 3. Skip/Block Reflection Modal
*   **User Intent**: Explaining why a planned task was not completed.
*   **Database Changes**: Updates `daily_plans.status` and `daily_plans.skipTrigger` / `daily_plans.skipReason`.
*   **Behavioral Problem**: Transforms "failure to execute" into a data point for self-awareness (identifying triggers like Burnout or Avoidance).

### 4. Drag-and-Drop Reordering
*   **User Intent**: Adjusting tactical priority before commitment.
*   **Database Changes**: Batch update of `daily_plans.position`.
*   **Validation**: Only allowed if `committedAt` is null.
*   **Behavioral Problem**: Allows for "Energy-based" sorting where high-impact tasks are moved to peak focus windows.

### 5. "Add to Plan" (Backlog Interaction)
*   **User Intent**: Manually promoting a task from the global inventory to today's execution stack.
*   **Database Changes**: Inserts new row into `daily_plans` for the current date.
*   **Validation**: Prevents duplicates in the plan.
*   **Behavioral Problem**: Supports "Custom Intention" for users who prefer manual curation over AI suggestions.

### 6. AI "Steer" Input
*   **User Intent**: Providing linguistic constraints to the AI Planner.
*   **Process**: Input is sent as a `guidance` string to the `/api/ai/plan/generate` endpoint.
*   **Behavioral Problem**: Solves the "Black Box" problem of AI by allowing users to co-author their plan (e.g., "I'm travelling today, only give me mobile-friendly tasks").

---

## SECTION 4 — COMPLETE USER WORKFLOWS

### Workflow: The Ideal Startup (Morning)
1.  User enters Dashboard at 08:00.
2.  Input Intention: "Finish the backend API and refactor tests."
3.  Click **Generate Plan**. AI populates 4 tasks across Minimum/Target tiers.
4.  User drags "API Refactor" to Position 1.
5.  Click **Commit to Stack**.
6.  *Emotional State*: High clarity, low friction.

### Workflow: The Manual Curation (Power User)
1.  User enters Dashboard and ignores the AI "Generate Plan" button.
2.  Opens the **Manual Task Backlog**.
3.  Scrolls through high-priority items.
4.  Clicks **Add** on three tasks, selecting the "Target" tier.
5.  Adds a "Workout" task to the "Refresh Pool" tier.
6.  Drags tasks to match the chronological flow of their day.
7.  Clicks **Commit to Stack**.
8.  *Behavioral Reasoning*: Reinforces a sense of agency and autonomy, which is critical for long-term habit sustainability.

### Workflow: The Chaos Recovery (Mid-day)
1.  User is 3 hours into a distraction loop.
2.  Opens Dashboard; Reality Timeline shows a massive "Distraction" block.
3.  User clicks **Distraction** (Stop) and immediately clicks **Start** on the top-priority task.
4.  *Behavioral Reasoning*: Low-friction "re-entry" into focus.

### Workflow: The Burnout Pivot
1.  User feels overwhelmed by the "Target" stack.
2.  User marks a task as **Skipped**.
3.  In the Reflection Modal, selects trigger: **"Burnout / Fatigue"**.
4.  System records the trigger for the AI Bodyguard report.

---

## SECTION 5 — NAVIGATION & SYSTEM RELATIONSHIPS

### Data Flow Map
1.  **Input**: Strategic Goals (from `Goal Strategy` page) and Backlog Tasks.
2.  **Coordination**: Home Dashboard filters and tiers these into `daily_plans`.
3.  **Verification**: `sessions` are logged against these plan items.
4.  **Output**: `commitment` score and `reflection` data flow into `AI Bodyguard` for behavioral analysis.

---

## SECTION 6 — BEHAVIORAL & PRODUCTIVITY ANALYSIS

### User Type: ADHD-like / Distractible
*   **Usage Pattern**: Heavy reliance on the **Timer Widget** and **Quick Activities**.
*   **Friction**: High friction in manually entering tasks.
*   **Opportunities**: Implementation of "Nudges" to detect if the timer has been running for > 2 hours without a break.

### User Type: Burnout Recovery
*   **Usage Pattern**: Primarily uses the **Refresh Pool** and **Minimum** tier.
*   **Emotional Response**: Relief when marking a task as "Skipped" due to energy, rather than just "Failed."

---

## SECTION 7 — FAILURE MODES & UX RISKS

### 1. Planning Addiction
*   **Cause**: User spends 60+ minutes regenerating and reordering the plan instead of starting.
*   **System Solution**: AI detects multiple regenerations and triggers a "Commitment Nudge" to stop planning.

### 2. Shame Loops
*   **Cause**: User forgets to log focus, Reality Timeline looks empty or "Distracted."
*   **UX Solution**: Retroactive logging must be as easy as real-time logging (Task Inspector integration).

---

## SECTION 8 — DATABASE SCHEMA (Reference)

```sql
-- Goals: High-level strategic ambitions
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    importance INTEGER DEFAULT 1,
    logical_reason TEXT,
    emotional_reason TEXT,
    deadline TIMESTAMPTZ,
    status TEXT DEFAULT 'active'
);

-- Tasks: Tactical units of work
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    type TEXT DEFAULT 'one-off',
    recurrence_rule TEXT,
    priority TEXT DEFAULT 'medium',
    estimated_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    scheduled_date TIMESTAMPTZ,
    energy_level TEXT,
    anticipated_friction TEXT,
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE
);

-- Daily Plans: The coordination layer
CREATE TABLE daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    tier TEXT NOT NULL DEFAULT 'target',
    rationale TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    skip_reason TEXT,
    skip_trigger TEXT,
    committed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions: The verification layer
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'focus',
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    interruptions INTEGER DEFAULT 0,
    friction_log TEXT
);
```

---

## SECTION 9 — TESTING & QA SCENARIOS

### Edge Case: The "Infinite Focus" Session
*   **Scenario**: User starts a session and forgets it for 24 hours.
*   **Expected Behavior**: System should detect the date change and automatically "suspend" the session at 23:59:59 or prompt for adjustment on next login.

### Edge Case: Multi-Tab Concurrency
*   **Scenario**: User has two Dashboard tabs open. Starts Task A in Tab 1, then starts Task B in Tab 2.
*   **Expected Behavior**: Tab 1 should reflect the Stop on Task A and Start on Task B via real-time listeners or polling.
