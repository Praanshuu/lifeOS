# LifeOS: The AI-Driven Priority Manager

### Documentation Overview

This document provides a comprehensive technical overview of **LifeOS (Priority Manager)** — an AI-powered personal productivity command center that bridges the gap between intention and execution using real behavioral data, autonomous goal decomposition, and reality-checked planning.

---

# 1. Project Overview

- **Project Name**: LifeOS (Priority Manager)
- **One-line Summary**: An AI-driven productivity dashboard that uses behavioral data, historical focus patterns, and autonomous goal decomposition to turn high-level ambition into a realistic daily execution stack.
- **Problem Statement**: Standard productivity tools are passive to-do lists. They record what users *hope* to accomplish while ignoring what they *actually* do. Users routinely fall victim to the **Planning Fallacy**—overestimating daily focus bandwidth, ignoring context-switching penalties, and underestimating task friction, leading to chronic backlog bloat and burnout.
- **Why It Exists**: LifeOS acts as an active accountability partner. It analyzes historical focus duration, distraction ratios, and skip triggers to calibrate daily workloads to real human capacity, refusing to rubber-stamp unrealistic schedules.
- **Target Users**: Engineers, founders, students, and knowledge workers managing complex multi-project workloads who require data-driven scheduling and behavioral accountability.

---

# 2. Key Features & Working Capabilities

### 1. AI Daily Priority Stack & Capacity Engine (`/`)
- **Tiered Planning**: Automatically structures the day into four distinct tiers:
  - **Minimum (Non-Negotiable)**: Essential tasks required to maintain momentum even on low-energy days.
  - **Target**: Core commitments aligned with current weekly deadlines and priorities.
  - **Stretch**: Bonus high-value tasks tackled only if energy and time permit.
  - **Refresh**: Built-in recovery and deliberate breaks.
- **Historical Capacity Calibration**: Analyzes 14-day focus summaries (comparing the last 7 days against the previous 7 days) to detect performance trends (`improving`, `stable`, `declining`) and burnout signals (e.g., elevated skip rates or fatigue triggers), adjusting daily planned minutes accordingly.
- **Dynamic Time Slices**: Slices large backlog tasks into digestible focus blocks (e.g., 45-minute sprint allocations) without premature task completion.
- **Skip & Blocker Reflection**: Captures root cause triggers (`avoidance`, `burnout`, `distraction`, `energy`, `technical`) when tasks are skipped or blocked to train future planning heuristics.

### 2. Behavioral Nudges & Live Interventions
- **Procrastination Alerts**: Flags high-priority tasks that have remained untouched for 4+ hours into the workday.
- **Overdue Slippage Warnings**: Highlights slipping deadlines before they compromise downstream deliverables.
- **Context-Switch Tax Calculation**: Tracks task switching frequency and calculates real-time estimated focus penalties (e.g., ~5% penalty per switch after 4+ switches).

### 3. Integrated Session Tracker & Day Timeline
- **Real-Time Timers**: Live session recording for deep focus tasks, deliberate breaks, and distraction episodes with database-persisted timestamps.
- **Friction & Interruption Logging**: Logs interruption counts and subjective friction notes upon session completion.
- **Manual Retroactive Logging**: Allows users to log completed work retroactively with instant status synchronization.
- **Visual 24-Hour Timeline**: Interactive timeline chart visualizing the distribution of focus blocks, breaks, and distraction periods across the day.

### 4. Autonomous Task Breakdown (`/api/ai/breakdown`)
- **AI-Driven Decomposition**: Breaks down large, ambiguous goals or parent tasks into sequenced, bite-sized sub-tasks with estimated durations and priority tags, directly inserted into the database task tree.

### 5. AI Bodyguard & Autonomous Agent (`/bodyguard`)
- **Radical Truth-Teller**: Delivers an unvarnished audit of user execution based on real data (commitment scores, total focus hours, high-priority pending bottlenecks).
- **Three Operational Modes**:
  - **Weekly Report**: Deep retrospective auditing completion ratios, skip triggers, and distraction patterns.
  - **Goal Planner**: High-level strategic roadmap generator tying long-term deadlines to actionable daily steps.
  - **Context-Aware Chat**: Interactive conversational assistant injected with the user's recent 7–14 day telemetry.
- **Autonomous Tool Calling**: Directly interacts with the database via LLM function calling to create tasks, update priorities, start sessions, create goals, and record system improvement insights.

### 6. Strategic Goals & Relational Database View (`/goals`)
- **Multi-View Database**: Notion-style workspace powered by `@tanstack/react-table` supporting Table, Kanban Board, and Goals Rollup views.
- **Hierarchical Time Aggregation**: Recursively calculates total time spent and estimated minutes from nested sub-tasks up to parent tasks and high-level goals.
- **Inline Editing & Filtering**: Fast status updates, priority adjustments, search, and goal alignment filters.

### 7. Activity Logs Ledger (`/logs`)
- Complete historical ledger of every focus session, break, and distraction event with calculated durations, interruption tallies, and friction annotations.

---

# 3. Modern Tech Stack

| Layer | Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Fullstack architecture utilizing React Server Components (RSC) and Server Actions for low-latency mutations. |
| **UI Library** | **React 19** | Latest React concurrency, transitions (`useTransition`), and declarative component model. |
| **Authentication** | **Clerk (`@clerk/nextjs` v7)** | Complete user authentication, session security, and multi-tenant data scoping (`clerkId`). |
| **Database** | **Neon Serverless Postgres** | Serverless relational database with instant connection pooling and scale-to-zero efficiency. |
| **ORM** | **Drizzle ORM (`drizzle-orm` / `drizzle-kit`)** | Zero-overhead, type-safe SQL query builder and schema management. |
| **AI / LLM Engine** | **Groq Cloud API** | Ultra-low latency inference via OpenAI-compatible endpoints using `llama-3.3-70b-versatile` & `llama-3.1-8b-instant`. |
| **Styling** | **Tailwind CSS 4** | Next-generation utility-first styling with `@tailwindcss/postcss` and dark-mode CSS design variables. |
| **Data Tables** | **TanStack Table (`@tanstack/react-table` v8)** | Headless table architecture for sorting, filtering, and managing relational task databases. |
| **Icons & UI Primitives**| **Lucide React & Radix UI** | Accessible, polished UI primitives and vector icons. |
| **Analytics** | **Vercel Web Analytics** | Real-world telemetry and performance monitoring. |

---

# 4. System Architecture & Data Flow

### High-Level Architecture Diagram
```mermaid
flowchart TD
    User([User Browser]) -->|Clerk Auth / UI Interactions| NextApp[Next.js 16 App Router]
    
    subgraph Server Layer
        NextApp -->|Server Actions / Server Components| Actions[src/app/actions.ts]
        NextApp -->|Route Handlers| AIRoutes[src/app/api/ai/*]
        Actions --> ContextBuilder[src/lib/context/*]
        AIRoutes --> ContextBuilder
    end

    subgraph Intelligence Layer
        ContextBuilder -->|14-Day Context Assembly| GroqLLM[Groq API: Llama-3.3-70b]
        GroqLLM -->|Tool Calling / Structured JSON| AIRoutes
    end

    subgraph Data Persistence
        Actions -->|Type-safe SQL Queries| DrizzleORM[Drizzle ORM]
        AIRoutes -->|Task Execution / Insertion| DrizzleORM
        DrizzleORM --> NeonDB[(Neon Serverless Postgres)]
    end
```

### Core Data Flow
1. **Authentication & User Provisioning**:
   - User authenticates via Clerk modal. Server Actions and API routes verify identity using `auth()`.
   - `ensureUserSetup(userId)` guarantees matching records in the Postgres `users` table and initializes default system activities (`Break`, `Distraction`, `Lunch`).
2. **Context Assembly (`src/lib/context`)**:
   - Assembles modular behavioral telemetry across 5 core domains: `goals`, `tasks`, `sessions`, `patterns`, and `behaviour`.
   - Aggregates session durations, median focus windows, skip triggers, and completion ratios over a rolling 7-to-30-day window.
3. **AI Execution & Planning**:
   - The assembled context is fed to Groq with strict JSON/tool schemas (`schedule_task`, `create_task`, `update_task`, etc.).
   - Tool call outputs execute directly against Neon Postgres via Drizzle ORM mutations.
4. **Reactive UI Sync**:
   - Mutations trigger `revalidatePath()` to refresh server-rendered views alongside responsive client-side state updates.

---

# 5. Database Schema Overview

The database is built on **Neon Postgres** via **Drizzle ORM** with foreign keys and multi-column indexes:

- **`users`**: Stores `clerk_id` (Primary Key), email, display name, and timezone.
- **`goals`**: High-level strategic objectives with `logical_reason`, `emotional_reason`, priority importance (1–3), and deadlines.
- **`tasks`**: Granular tasks linked to `goals.id` and optional `parent_task_id` for recursive sub-task trees. Tracks estimated minutes, scheduled dates, priorities (`critical`, `high`, `medium`, `low`), and anticipated friction.
- **`daily_plans`**: Daily schedule items for each date linking to `tasks.id`. Stores `tier` (`minimum`, `target`, `stretch`, `refresh`), `position`, `allocated_minutes`, `status` (`planned`, `done`, `skipped`, `blocked`), `skip_reason`, and `skip_trigger`.
- **`activities`**: Standard and custom activities (`break`, `distraction`, `lunch`) for non-task time tracking.
- **`sessions`**: Logged focus intervals and activity sessions with `start_time`, `end_time`, `interruptions`, and `friction_log`.
- **`day_logs`**: End-of-day reflections, ratings, and commitment metrics.

---

# 6. Engineering Challenges & Solutions

### 1. The Planning Fallacy & Dynamic Capacity Modeling
- **Challenge**: Users consistently overbook their daily schedules, leading to incomplete daily plans and demotivation.
- **Solution**: Implemented a math-first capacity engine (`estimateDailyCapacityDetails`) that calculates rolling 7-day average focus minutes, detects declining velocity or burnout indicators, applies progressive adjustment offsets (+20m stretch for consistency, -20% reduction for fatigue), and enforces hard-clamped daily time budgets (120m to 480m).

### 2. Time-Slice Task Allocation vs. Full Task Completion
- **Challenge**: Scheduling a 4-hour epic task into a 45-minute daily focus slice caused status collision bugs where marking the daily item as completed prematurely resolved the underlying multi-day task.
- **Solution**: Designed the schema and actions to distinguish between full tasks and daily allocated time slices (`allocatedMinutes < estimatedMinutes`). Completing a daily slice updates `daily_plans.status = 'done'` while keeping the parent task active in the backlog until fully completed.

### 3. Recursive Time Aggregation in Hierarchical Tasks
- **Challenge**: Sub-tasks track granular focus sessions, but parent tasks and high-level strategic goals need accurate real-time aggregates of total spent minutes and remaining estimates without expensive N+1 queries.
- **Solution**: Combined SQL aggregation (`COALESCE(SUM(EXTRACT(EPOCH FROM ...)))`) in Drizzle with client-side tree propagation in `DatabaseView.tsx` to roll up spent and estimated minutes across arbitrary subtask depths.

### 4. Preventing AI Tool-Calling Loops & Redundant Scheduling
- **Challenge**: During multi-step AI planner iterations, the LLM occasionally attempted to schedule the same task multiple times across sequential tool-calling turns.
- **Solution**: Built an in-memory execution guard (`scheduledTaskIds: Set<string>`) inside `generateDailyPlan` that validates task uniqueness per plan iteration before writing to the database.

---

# 7. Interview Demonstration & Talking Points

### What Makes LifeOS Technically Distinct?
1. **Behavioral Grounding, Not Generic LLM Chat**: Prompts are not simple text inputs; they are fed a 14-day telemetry payload computed from SQL aggregations (focus averages, context-switch frequencies, skip triggers).
2. **Deterministic Mathematical Constraints Before AI Generation**: The AI cannot hallucinate an 8-hour workday if the user's historical median focus capacity is 3.5 hours.
3. **Autonomous Agent with Database Execution**: The AI Bodyguard and Daily Planner do not just offer advice; they invoke type-safe server-side tools that manipulate the Postgres task database directly.
4. **End-to-End Type Safety**: Drizzle ORM schemas map 1:1 to TypeScript interfaces, providing full type safety across Server Actions, API routes, and client components.

---

# 8. Resume Bullet Points

- **Full-Stack AI Productivity Platform**: Built a full-stack command center using **Next.js 16**, **React 19**, **Neon Postgres**, and **Drizzle ORM** that mitigates the Planning Fallacy through automated behavioral pattern analysis and capacity-calibrated scheduling.
- **Real-Time Telemetry & Behavioral Analytics**: Engineered a behavioral intelligence layer aggregating focus duration, context-switching friction, and skip triggers across rolling 14-day windows to dynamically constrain AI-generated daily schedules.
- **Agentic Function Calling with Groq**: Integrated ultra-low latency LLM pipelines (**Groq / Llama 3.3 70B**) executing multi-turn tool calling for autonomous goal decomposition and database mutations.
- **Secure Multi-Tenant Architecture**: Implemented robust user authentication and tenant data isolation using **Clerk Auth** and indexed Postgres relations.

---

# 9. Setup & Local Development

### Prerequisites
- Node.js 18+ or 20+
- Neon Postgres account (or Postgres connection string)
- Clerk account (Publishable & Secret Keys)
- Groq API Key (free from [console.groq.com](https://console.groq.com/keys))

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/priority_manager.git
   cd priority_manager
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env.local` file with the following variables:
   ```env
   # Database (Neon Postgres)
   DATABASE_URL=postgresql://user:password@ep-sample-pooler.neon.tech/neondb?sslmode=require

   # Authentication (Clerk)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # AI Backend (Groq Cloud)
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
4. **Push Database Schema**:
   ```bash
   npx drizzle-kit push
   ```
5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.