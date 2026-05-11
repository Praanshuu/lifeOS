# Operational Systems Documentation: Activity Logs

## SECTION 1 — PAGE PURPOSE

### Systemic Objective
The Activity Logs page is the **Historical Reflection Layer** of the Priority Manager platform. It serves as the primary source of ground-truth data regarding time allocation, focus quality, and systemic friction.

### Problem Resolution
1.  **Recall Bias**: Humans often overestimate their focus time and forget specific distractions. This page provides an immutable chronological record.
2.  **Qualitative Blindness**: Standard timers only track duration. This page captures the **Friction Log**, providing context on *why* a session was productive or hindered.
3.  **Pattern Identification**: By aggregating sessions over time, the system identifies performance correlations (e.g., specific tasks consistently leading to high interruptions).

### Systemic Context
The data generated here is consumed by the **AI Bodyguard (Behavioral Intelligence)**. The Bodyguard analyzes friction logs and session durations to adjust future AI-generated plans, suggesting longer buffers for tasks that historically incur high friction.

---

## SECTION 2 — FULL PAGE LAYOUT BREAKDOWN

### 1. Chronological Session Stream
*   **UI Position**: Main central table.
*   **Purpose**: Display a reverse-chronological list of every focus session (manual or timer-based).
*   **Related Tables**: `sessions`, `tasks`, `activities`.
*   **Key Fields**: Date, Task/Activity Title, Duration, Start/End timestamps, Friction Notes.
*   **Behavioral Purpose**: Visualizing the "Tidal Flow" of energy and focus over days and weeks.

### 2. Global Search & Audit Toolbar
*   **UI Position**: Top of the logs list.
*   **Purpose**: Filter historical data for specific audits.
*   **Search Scope**: Task titles, dates (e.g., "May 10"), and friction note content.
*   **Behavioral Purpose**: Allowing the user to perform "Post-Mortems" on specific goals or high-friction periods.

### 3. Focus Metrics Indicators
*   **Logged Duration**: Shown in cyan (e.g., "45m logged").
*   **Live Status**: Indicated by a pulsing yellow "In Progress" badge for active timers.
*   **Behavioral Purpose**: Providing immediate visual distinction between completed history and current effort.

---

## SECTION 3 — INTERACTION-LEVEL DOCUMENTATION

### 1. The Friction Logging System
*   **User Intent**: Documenting the qualitative experience of a session.
*   **Trigger**: Clicking the "Friction & Notes" cell.
*   **Input Handling**: Supports multi-line text input. `Ctrl+Enter` or `Cmd+Enter` to save.
*   **DB Operations**: `UPDATE` `sessions.friction_log` via `updateSessionFriction` action.
*   **Behavioral Purpose**: Transforming raw time data into **Actionable Intelligence**. Instead of "I worked for 2 hours," the system records "I worked for 2 hours but was interrupted 3 times by Slack."

### 2. Session Type Differentiation
*   **Task Sessions**: Automatically display the associated Task Title and Goal hierarchy.
*   **General Activities**: Display the Activity name (e.g., "Deep Work," "Planning").
*   **Systemic Benefit**: Distinguishing between "Progress on Goals" and "General Maintenance/Overhead."

### 3. Chronological Integrity
*   **Sorting**: Data is strictly sorted by `startTime DESC`.
*   **Duration Calculation**: `(endTime - startTime) / 60,000`, rounded to the nearest minute.
*   **Edge Case Handling**: Sessions without an `endTime` are treated as "Active" and exclude duration calculations.

---

## SECTION 4 — COMPLETE USER WORKFLOWS

### Workflow: The Weekly Post-Mortem
1.  **Access**: User opens the Activity Logs at the end of the week.
2.  **Filter**: Searches for "Friction" or specific goal keywords.
3.  **Analyze**: Identifies a cluster of sessions with notes like "Hard to start" or "Too many emails."
4.  **Adapt**: User adjusts their next Weekly Plan to include more "Isolation Time" to mitigate identified friction.

### Workflow: Real-Time Friction Capture
1.  **Execute**: User finishes a timer session on the Home Dashboard.
2.  **Record**: User immediately navigates to Logs (or uses the Task Inspector) to add a friction note: "Distracted by phone."
3.  **Intelligence**: The AI Bodyguard notes the "Phone" trigger for future focus-mode suggestions.

---

## SECTION 5 — SYSTEM RELATIONSHIPS

| Entity | Role | System Connection |
| :--- | :--- | :--- |
| **Sessions** | **Raw Data** | The primary record stored in the DB. |
| **Tasks** | **Context** | Provides the "What" for the session. |
| **Friction Log** | **Signal** | Provides the "How" for the AI Bodyguard. |
| **Bodyguard** | **Processor** | Aggregates logs into Behavioral Patterns. |

---

## SECTION 6 — BEHAVIORAL & PSYCHOLOGICAL ANALYSIS

### 1. The Power of "Micro-Journaling"
By integrating notes directly into the time-log, the system bypasses the "Blank Page Syndrome" of traditional journaling. The context (the task) is already there; the user only needs to add the friction.

### 2. Combating "Execution Amnesia"
Users often feel busy but unproductive. Seeing the cumulative duration of "General Maintenance" vs. "High Importance Goals" provides the **Radical Transparency** needed to correct course.

---

## SECTION 7 — FAILURE MODES & UX RISKS

### 1. Data Gaps (The "Ghost Session" Problem)
*   **Cause**: User performs work without starting a timer or logging manually.
*   **Risk**: The AI Bodyguard makes decisions based on incomplete data.
*   **Mitigation**: The system should prompt for "Missing Time" if a large gap exists between focus sessions during working hours.

### 2. Friction Fatigue
*   **Cause**: User finds it tedious to add notes to every session.
*   **Risk**: Friction logs become empty or repetitive ("Fine," "Good").
*   **Mitigation**: Use AI to suggest friction categories (e.g., "Internal Distraction," "Tooling Issue") via a single-click interface.

---

## SECTION 8 — TESTING & QA SCENARIOS

### 1. Live Update Reliability
*   Start a timer in one tab, verify "In Progress" status appears in the Logs tab without a manual refresh.

### 2. Duration Rounding
*   Ensure a 59-second session does not round to 1 minute if it would mislead the total duration. (Current logic rounds to nearest minute).

### 3. Search Concurrency
*   Verify search results update immediately upon typing without flickering or losing input focus.
