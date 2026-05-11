# Operational Systems Documentation: AI Bodyguard

## SECTION 1 — PAGE PURPOSE

### Systemic Objective
The AI Bodyguard is the **Cognitive Intelligence Layer** of the Priority Manager platform. It exists to transform raw behavioral data into actionable insights, provide natural language control over the database, and generate high-fidelity execution strategies.

### Problem Resolution
1.  **Complexity Paralysis**: When a user has 50+ tasks, they often cannot identify the optimal next step. The Bodyguard performs **Multi-Vector Analysis** (Importance + Urgency + Historical Friction) to recommend focus.
2.  **Data Blindness**: Users generate data (sessions, friction logs) but rarely analyze it. The Bodyguard performs **Pattern Recognition** to identify performance leaks.
3.  **Friction in CRUD**: Manually editing database rows is high-friction. The Bodyguard provides a **Conversational Interface** for rapid database mutation.

### Intelligence Backends
*   **Local (Ollama)**: Privacy-first inference. Used for sensitive data analysis when local hardware permits.
*   **Cloud (Groq)**: High-speed inference using LPUs. Used for complex strategic planning and rapid responses.

---

## SECTION 2 — THE THREE OPERATIONAL MODES (TABS)

### 1. Chat (The Agentic Generalist)
*   **Operational Role**: Real-time system interaction and data querying.
*   **Capabilities (What it CAN do)**:
    *   **Cross-Entity Analysis**: Correlate goal importance with actual focus sessions.
    *   **Database Mutation**: Create, update, and delete tasks or goals via verified function calling.
    *   **Contextual Advice**: Recommend the next task based on current energy levels and deadlines.
    *   **History Retrieval**: Recall specific friction logs or session details from the past 7 days.
*   **Limitations (What it CANNOT do)**:
    *   **External Integration**: It cannot access external APIs, send emails, or check the weather.
    *   **Real-time Execution**: It cannot "do" the work (e.g., write the code or make the call).
    *   **Extended Memory**: Context is limited to the last few days of activity to maintain inference speed.

### 2. Weekly Report (The Radical Truth Analyst)
*   **Operational Role**: Performance auditing and focus-leak detection.
*   **Capabilities (What it CAN do)**:
    *   **14-Day Audit**: Analyze session volume, completion rates, and friction patterns over a 2-week window.
    *   **Leak Detection**: Identify specific "Focus Killers" (e.g., "You lose 40% of your Tuesday mornings to unplanned admin").
    *   **Radical Truth Briefing**: Generate a blunt, data-driven report on whether the user is moving toward or away from their Level 5 goals.
*   **Limitations (What it CANNOT do)**:
    *   **Real-time Chat**: This mode is optimized for generating one-shot, high-density reports, not back-and-forth conversation.
    *   **Predictive Certainty**: It analyzes historical patterns but cannot predict future emergencies.

### 3. Goal Planner (The Strategic Architect)
*   **Operational Role**: Long-term objective decomposition and execution mapping.
*   **Capabilities (What it CAN do)**:
    *   **Recursive Breakdown**: Take a "Monolithic Ambition" (e.g., "Launch a Startup") and generate a multi-week task strategy.
    *   **Time-Boxing**: Suggest realistic `estimatedMinutes` and `scheduledDate` for each micro-step.
    *   **Strategic Weighting**: Assign importance levels based on the user's description of the goal's logical and emotional reasons.
*   **Limitations (What it CANNOT do)**:
    *   **Daily Scheduling**: While it plans the strategy, the **Daily Planner (Home Dashboard)** remains the final authority on what is actually scheduled for today based on real-time capacity.

---

## SECTION 3 — SYSTEM STATE PANEL (REAL-TIME METRICS)

### 1. Commitment Score (0-100%)
*   **Logic**: Calculated by comparing `planned_tasks` vs `completed_tasks` over the recent history.
*   **Behavioral Purpose**: Visualizing "Integrity." A high score indicates a user who honors their commitments; a low score indicates a "Planning Fantasy" pattern.

### 2. Focus Hours (14d)
*   **Logic**: Sum of `spentMinutes` from the `sessions` table over the last 14 days.
*   **Behavioral Purpose**: Measuring the "Volume of Effort" independent of task completion.

### 3. High-Priority Count
*   **Logic**: Count of tasks where `priority === 'high'` or `'critical'` and `status === 'pending'`.
*   **Behavioral Purpose**: Visualizing "Cognitive Load." High numbers indicate a system in "Emergency Mode."

---

## SECTION 4 — INTERACTION-LEVEL DOCUMENTATION

### 1. Function Calling (Agentic Tools)
*   **create_task**: Adds a new record to `tasks`.
*   **update_task**: Modifies status/priority/date for a specific ID.
*   **delete_task**: Removes a task from the DB (requires explicit user confirmation).
*   **start_activity_session**: Starts a timer for "Break" or "Distraction" (prevents polluting goal progress).

### 2. Context Assembling
*   **Trimmed Context**: To prevent token-limit errors, the system "Trims" data:
    *   **Goals**: Top 10 active goals.
    *   **Tasks**: Top 25 pending tasks + all "Parent" tasks.
    *   **Sessions**: Last 3 days of focus summaries.
*   **Systemic Benefit**: Ensures the AI has enough data to be useful without becoming sluggish or expensive.

---

## SECTION 5 — BEHAVIORAL & PSYCHOLOGICAL ANALYSIS

### 1. The "Bodyguard" Metaphor
The system is not just an assistant; it is a "Bodyguard" for the user's time. It is designed to say "No" to low-value tasks and "Yes" to the Level 5 goals that the user has historically neglected.

### 2. Combatting the "Planning Fallacy"
By forcing the AI to see the user's historical **Friction Logs**, the Agent becomes a "Realist." It will stop suggesting 10-hour workdays if the logs show the user typically burns out after 4 hours.

---

## SECTION 6 — FAILURE MODES & UX RISKS

### 1. Hallucination Risk
*   **Scenario**: AI claims it deleted a task but the database call failed.
*   **Mitigation**: The UI explicitly renders "**Actions executed:**" blocks only *after* a successful DB response.

### 2. Model Latency
*   **Scenario**: Local Ollama model takes 60+ seconds to respond.
*   **Mitigation**: System displays a "Pulsing Loader" and provides a "Fallback to Groq" option in the UI settings.

### 3. Context Overflow
*   **Scenario**: User has 1000 tasks, and the context window is exceeded.
*   **Mitigation**: System uses `trimContext()` to prioritize the most relevant "High Priority" and "Recently Active" data.

---

## SECTION 7 — TESTING & QA SCENARIOS

### 1. Tool Call Verification
*   Ask: "Change the status of [Task Name] to completed."
*   **Expected**: AI should identify the correct ID, call `update_task`, and the UI should update the status in real-time.

### 2. Cross-Mode Consistency
*   Ask a question in **Chat**, switch to **Weekly Report**, and ensure the report reflects the data discussed in Chat.

### 3. Multi-Model Switching
*   Switch from **Ollama (Local)** to **Groq (Cloud)** mid-conversation and verify context (history) is preserved and sent to the new model.
