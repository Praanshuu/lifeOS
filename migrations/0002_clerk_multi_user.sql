CREATE TABLE IF NOT EXISTS users (
  clerk_id text PRIMARY KEY,
  email text,
  display_name text,
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE daily_plans ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE day_logs ADD COLUMN IF NOT EXISTS user_id text;

ALTER TABLE activities
  ADD CONSTRAINT activities_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(clerk_id) ON DELETE CASCADE;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(clerk_id) ON DELETE CASCADE;
ALTER TABLE goals
  ADD CONSTRAINT goals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(clerk_id) ON DELETE CASCADE;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(clerk_id) ON DELETE CASCADE;
ALTER TABLE daily_plans
  ADD CONSTRAINT daily_plans_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(clerk_id) ON DELETE CASCADE;
ALTER TABLE day_logs
  ADD CONSTRAINT day_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(clerk_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_activities_user_name_type ON activities(user_id, name, type);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_plans_user ON daily_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_day_logs_user ON day_logs(user_id);

ALTER TABLE day_logs DROP CONSTRAINT IF EXISTS day_logs_pkey;
ALTER TABLE day_logs ADD PRIMARY KEY (user_id, date);
