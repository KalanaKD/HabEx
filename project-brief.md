# Habit + Expense Tracker — Project Brief

## Goal
A habit/task tracker (points, streaks, levels) + expense tracker (category budgeting).
- **Android APK** (Kalana, personal use): local SQLite, offline-first, as originally built.
  **This path must not change behavior.**
- **Web app** (friend, iPhone via browser): new addition, backed by Supabase (Postgres +
  Auth + RLS), deployed on Vercel.

These are two separate data stores. They are not synced — each platform's user manages
their own local/cloud data independently. That's intentional and fine for this use case.

## Critical constraint
The Android app already works. **Any refactor must preserve its exact current behavior.**
The safe way to add the web/Supabase path without risking the Android path:
1. Extract the current SQLite calls behind a `DataClient` TypeScript interface —
   a pure extraction, no logic changes. Verify the Android build still behaves
   identically after this step before doing anything else.
2. Add a new `supabaseDataClient.ts` implementing the *same* interface.
3. Pick the implementation at runtime based on platform
   (`Capacitor.isNativePlatform()` → SQLite client; plain browser → Supabase client).
4. Shared UI/feature components (`HabitList`, `ExpenseList`, dashboards, `points.ts`,
   `scienceTips.ts`) call the interface only — they don't change at all.

## Tech stack
- Frontend: React 18 + TypeScript + Vite + Tailwind + Recharts — shared by both targets.
- Android: Capacitor + `@capacitor-community/sqlite` (existing, unchanged).
- Web: Supabase (Postgres + Auth + RLS), deployed as a static Vite build on **Vercel**
  (Hobby plan — free for personal/non-commercial use, ~100 GB bandwidth/month).
  - Supabase free tier: 500 MB database, 50,000 MAUs, 5 GB bandwidth, 2 active projects.
    A free project auto-pauses after 7 days of no activity (resumes in ~30s on next login).
- Auth: only shown on the web build (sign in / sign up screen). The Android app has no
  login — it's a single local device, same as before.

## Domain types (shared by both DataClient implementations)
```ts
interface Habit { id: string; name: string; type: 'habit'|'daily'|'todo';
  difficulty: 'trivial'|'easy'|'medium'|'hard'; basePoints: number;
  schedule?: string; scienceTag?: string; active: boolean; createdAt: string; }
interface HabitLog { id: string; habitId: string; completedOn: string;
  pointsEarned: number; streakAtTime: number; }
interface Category { id: string; name: string; budgetGroup: 'needs'|'wants'|'savings'; }
interface Expense { id: string; categoryId: string; amount: number;
  spentOn: string; note?: string; isRecurring: boolean; }
interface Budget { id: string; categoryId: string; month: string; limitAmount: number; }
interface Goal { id: string; name: string; targetAmount: number; currentAmount: number; }
```

## DataClient interface (implemented twice — SQLite and Supabase — never called directly)
```ts
interface DataClient {
  getHabits(): Promise<Habit[]>;
  addHabit(input: Omit<Habit,'id'|'createdAt'>): Promise<Habit>;
  logHabitComplete(habitId: string): Promise<HabitLog>;
  getHabitLogs(habitId: string, range?: {from: string; to: string}): Promise<HabitLog[]>;
  getCategories(): Promise<Category[]>;
  addCategory(input: Omit<Category,'id'>): Promise<Category>;
  getExpenses(month?: string): Promise<Expense[]>;
  addExpense(input: Omit<Expense,'id'>): Promise<Expense>;
  getBudgets(month: string): Promise<Budget[]>;
  setBudget(input: Omit<Budget,'id'>): Promise<Budget>;
  getGoals(): Promise<Goal[]>;
}
```

## Supabase schema (web path only — Postgres, with RLS)
```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('habit','daily','todo')),
  difficulty TEXT NOT NULL CHECK(difficulty IN ('trivial','easy','medium','hard')),
  base_points INTEGER NOT NULL,
  schedule TEXT,
  science_tag TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  habit_id UUID NOT NULL REFERENCES habits(id),
  completed_on DATE NOT NULL,
  points_earned INTEGER NOT NULL,
  streak_at_time INTEGER NOT NULL
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  budget_group TEXT NOT NULL CHECK(budget_group IN ('needs','wants','savings'))
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  amount NUMERIC NOT NULL,
  spent_on DATE NOT NULL,
  note TEXT,
  is_recurring BOOLEAN DEFAULT false
);

CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  month TEXT NOT NULL,
  limit_amount NUMERIC NOT NULL
);

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0
);

-- repeat for every table above:
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own habits" ON habits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

## Points / level formulas (unchanged, used by both clients)
```
base_points   = { trivial: 5, easy: 10, medium: 20, hard: 35 }
streak_bonus  = min(streak_days * 2, 30)
points_earned = base_points[difficulty] + streak_bonus
level         = floor(sqrt(total_points / 100))
```

## Money rules (unchanged, used by both clients)
- Every category tagged `needs` / `wants` / `savings` — dashboard compares actual ratio to the 50/30/20 target.
- Zero-based monthly budgeting: allocate `limit_amount` per category per month.
- Overspend flag: this month's category spend > 1.3x trailing 3-month average.

## Migration steps — each one is a checkpoint, verify Android still works before continuing
1. **Extraction**: move existing SQLite logic into `sqliteDataClient.ts` implementing `DataClient`, with zero behavior change. Run the Android build and manually confirm habit/expense logging still works exactly as before.
2. **Supabase project**: create it, run the schema + RLS above, enable email/password auth.
3. **Supabase client**: add `supabaseDataClient.ts` implementing the same `DataClient` interface.
4. **Platform switch**: `getDataClient()` factory — `Capacitor.isNativePlatform()` → SQLite client, else → Supabase client.
5. **Auth screens**: sign-in/sign-up, shown only when the Supabase client is active (i.e., not on native Android).
6. **Web deploy**: push to GitHub, connect Vercel, set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as environment variables, confirm the friend can sign up and use the app from an iPhone browser.
7. **Regression pass**: rebuild the Android APK one more time and confirm it behaves identically to before this whole change — this is the acceptance test for "we didn't break the existing app."

## Non-goals for this change
- No sync between the Android app's local data and the web app's Supabase data.
- No changes to Android build config, `capacitor.config.ts`, or the `android/` folder.
- No changes to existing SQLite table structure or logic.