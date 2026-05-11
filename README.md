# 🛡️ Priority Manager

**Priority Manager** is an AI-driven productivity platform designed to bridge the gap between high-level ambition and daily execution. It uses autonomous agents and behavioral analysis to help users focus on what truly matters.

## 🚀 Key Features

- **AI Priority Stack**: Autonomous daily planning that builds a structured execution stack.
- **Goal Decomposition**: Automatically break down high-level goals into micro-tasks.
- **AI Bodyguard**: A behavioral intelligence dashboard tracking commitment and focus.
- **Recursive Progress**: Visual rollup of progress from tasks up to high-level goals.
- **Real-Time Cockpit**: Integrated session tracking for tasks, breaks, and distractions.

## 🛠 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org) (App Router)
- **Database**: [Neon Postgres](https://neon.tech)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team)
- **AI**: Google Gemini
- **Styling**: Tailwind CSS + Lucide Icons

## 🚦 Getting Started

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Copy `.env.example` to `.env.local` and fill in your Neon and AI credentials.

3. **Database Migration**:
   ```bash
   npm run db:push
   ```

4. **Run Dev Server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to start managing your priorities.

---

*Detailed documentation can be found in [DOCUMENTATION.md](./DOCUMENTATION.md)*
