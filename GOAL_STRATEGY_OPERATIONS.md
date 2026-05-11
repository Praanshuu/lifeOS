# Operational Systems Documentation: Goals & Inventory Strategy

## SECTION 1 — PAGE PURPOSE

### Systemic Objective
The Goals & Inventory Strategy page (Database) is the **Repository of Intent**. It serves as the master coordination layer where high-level strategic visions (Goals) are managed alongside the global tactical inventory (Tasks). 

### Problem Resolution
1.  **Contextual Fragmentation**: Standard task lists lack a connection to long-term meaning. This page enforces a Goal-Task hierarchy.
2.  **Backlog Rot**: Without a board view, pending tasks often disappear into a list. This page provides a status-based **Kanban** visualization for execution flow.
3.  **Priority Inflation**: In unconstrained systems, everything becomes "urgent." This page implements **Constrained Scarcity** via a slot-based Importance System.

### Functional Roles
*   **Inventory Management (Table)**: Bulk editing, granular filtering, and performance auditing (Spent vs. Estimated time).
*   **Execution Mapping (Board)**: Visualizing the current tactical workload across different execution stages (Backlog → Up Next → Done).
*   **Strategic Alignment (Objectives)**: Long-term objective management, motivational context setting, and hierarchical task rollups.

---

## SECTION 2 — FULL PAGE LAYOUT BREAKDOWN

### 1. Global View Controller & Filter Engine
*   **UI Position**: Top of the page.
*   **Purpose**: Orchestrate the three primary strategic views.
*   **State Dependencies**: `activeView` ('table' | 'board' | 'goals'), `searchQuery`, `priorityFilter`, `goalFilter`, `statusFilter`.
*   **User Actions**: Switch views, filter by priority/goal/status, clear all filters.
*   **Side Effects**: Propagates filtered data slices to all sub-components.

### 2. Task Inventory (Table View)
*   **UI Position**: Main content area when `activeView === 'table'`.
*   **Purpose**: Dense, high-information-density list for bulk auditing.
*   **Information Displayed**: Task Name, Status (interactive), Due Date (overdue indicators), Priority (interactive), Execution Progress (spent/est bar).
*   **Related Tables**: `tasks`, `sessions`, `goals`.
*   **User Actions**: Manual completion (triggering retroactive session logging), priority shifting, task deletion, row selection for deep inspection.
*   **Behavioral Purpose**: Satisfying the "Auditor" persona—checking for underestimation patterns and overdue risks.

### 3. Execution Flow (Board View)
*   **UI Position**: Main content area when `activeView === 'board'`.
*   **Purpose**: Status-based visualization of the global task pipeline.
*   **Column Logic**:
    *   **Backlog**: Tasks with no date or future dates.
    *   **Up Next**: Tasks scheduled for today or earlier (pending).
    *   **In Progress**: Actively tracked tasks.
    *   **Done**: Completed tasks.
*   **Behavioral Purpose**: Satisfying the "Tactician" persona—identifying bottlenecks in the "In Progress" column and preparing the "Up Next" queue.

### 4. Objective Strategy (Objectives View)
*   **UI Position**: Main content area when `activeView === 'goals'`.
*   **Purpose**: Management of high-level meaningful objectives.
*   **Information Displayed**: Importance Levels (1-5), Slot availability (2/2 for Lvl 5), Logical/Emotional reasons, Goal-specific task rollups.
*   **Hierarchy Rendering**: Goals → Workstreams (Parent Tasks) → Micro-tasks (Leaf Tasks).
*   **Behavioral Purpose**: Satisfying the "Architect" persona—aligning life direction with tactical effort and managing motivational triggers.

---

## SECTION 3 — INTERACTION-LEVEL DOCUMENTATION

### 1. Goal Importance Slot Locking
*   **User Intent**: Assigning life-relevance to a goal.
*   **Logic**: Level 5 (2 slots), Level 4 (4 slots), Level 3 (6 slots).
*   **System Behavior**: Dropdown options are dynamically disabled based on current active goal counts.
*   **Validation**: Prevents creation of a Level 5 goal if `counts[5] >= 2`.
*   **Behavioral Purpose**: Forcing the user to prioritize *fewer* things at a high level.

### 2. Manual Completion (The "Radical Truth" Entry)
*   **User Intent**: Retroactively logging effort for a task done offline.
*   **Trigger**: Marking a task as "Completed" in the Table or Inspector.
*   **Modal Side Effects**: Captures `spentMinutes` and `frictionLog` (notes).
*   **DB Operations**: 
    1.  `INSERT` into `sessions` with retroactive `startTime`.
    2.  `UPDATE` `tasks.status` to 'completed'.
    3.  `UPDATE` `daily_plans.status` to 'done'.
*   **Behavioral Purpose**: Maintaining data integrity without requiring the real-time timer for every action.

### 3. Hierarchical Expansion (Objectives View)
*   **User Intent**: Drilling down from a goal into its micro-tasks.
*   **Logic**: Recursive rendering of parent-child relationships.
*   **Data Aggregation**: Parent progress bars automatically sum the `spent` and `est` minutes of all recursive children.
*   **Behavioral Purpose**: Visualizing the "Density of Effort" required for a major goal.

---

## SECTION 4 — COMPLETE USER WORKFLOWS

### Workflow: Strategic Decomposition
1.  **Identify**: User creates a Goal "Pass Certification." (Lvl 5).
2.  **Context**: Logic: "Required for job." Emotional: "Pride in mastery."
3.  **Breakdown**: User uses the AI Breakdown tool (in Inspector) to generate 10 micro-tasks.
4.  **Visualize**: User switches to **Board View** to see the 10 tasks in the "Backlog."
5.  **Schedule**: User schedules the first 3 tasks for the next 3 days.
6.  **Update**: Tasks move from "Backlog" to "Up Next" in the Board view.

### Workflow: The Inventory Audit
1.  User enters **Table View**.
2.  Filters by "High Priority" and "Pending".
3.  Identifies 5 tasks that are overdue.
4.  Reschedules 3 and demotes priority for 2.
5.  *Behavioral Result*: Reduced cognitive debt and "Red-text" anxiety.

---

## SECTION 5 — SYSTEM RELATIONSHIPS

| Page | Primary Data Entity | Systemic Role |
| :--- | :--- | :--- |
| **Home Dashboard** | `daily_plans` | **The Execution**: What I am doing *now*. |
| **Goals & Inventory** | `goals` & `tasks` | **The Strategy**: What I *intend* to do eventually. |
| **Logs** | `sessions` | **The History**: What I *actually* did. |
| **Bodyguard** | `behaviours` | **The Intelligence**: How I *behave* during execution. |

---

## SECTION 6 — BEHAVIORAL & PSYCHOLOGICAL ANALYSIS

### 1. View-based Cognitive Shifting
*   **Table View**: Logical, analytical, auditing. (Reduces uncertainty).
*   **Board View**: Spatial, flow-oriented. (Reduces momentum friction).
*   **Objectives View**: Meaning-based, long-term. (Increases persistence).

### 2. The Psychology of "Up Next"
By distinguishing "Up Next" (scheduled for now) from the "Backlog" (scheduled for later), the system creates a "Focus Tunnel." This prevents the user from being distracted by future tasks while trying to execute current ones.

---

## SECTION 7 — FAILURE MODES & UX RISKS

### 1. Inventory Overload
*   **Scenario**: User has 500 tasks in the "Backlog."
*   **Behavioral Risk**: The Board View becomes unusable/unscannable.
*   **Mitigation**: System should suggest "Archiving" tasks that have been in the backlog for > 30 days without activity.

### 2. Goal-Task Disconnect
*   **Scenario**: User has 10 goals but all tasks are "Standalone."
*   **Behavioral Risk**: High-level objectives never get executed.
*   **Mitigation**: Objectives View highlights goals with "Zero Linked Tasks."

---

## SECTION 8 — TESTING & QA SCENARIOS

### 1. View State Persistence
*   Ensure that switching from Table to Board and back preserves search queries and filters.

### 2. Kanban Categorization
*   Verify that a task scheduled for "Yesterday" and still "Pending" correctly appears in "Up Next" (urgency check).
*   Verify that a task with no goalId still renders correctly in the Board view.

### 3. Recursive Progress Edge Cases
*   Goal progress with only parent tasks (no children).
*   Goal progress with deeply nested (3+ levels) task hierarchies.
