-- Habit + Expense Tracker schema (from project-brief.md).
-- Every statement uses IF NOT EXISTS so this file can be executed on every
-- app launch: first launch creates the tables, later launches are no-ops.

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('habit','daily','todo')),
  difficulty TEXT NOT NULL CHECK(difficulty IN ('trivial','easy','medium','hard')),
  base_points INTEGER NOT NULL,
  schedule TEXT,          -- 'daily' | 'weekdays' | 'weekly'
  science_tag TEXT,       -- e.g. 'Fogg tiny habit', 'gratitude RCT'
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id),
  completed_on TEXT NOT NULL,     -- date
  points_earned INTEGER NOT NULL,
  streak_at_time INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  budget_group TEXT NOT NULL CHECK(budget_group IN ('needs','wants','savings'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  amount REAL NOT NULL,
  spent_on TEXT NOT NULL,
  note TEXT,
  is_recurring INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  month TEXT NOT NULL,       -- 'YYYY-MM'
  limit_amount REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0
);
