-- HabEx web schema (Supabase / Postgres). Run once in the SQL editor.
-- Mirrors the on-device SQLite schema, plus a user_id on every row so
-- Row Level Security can scope everything to the signed-in user.

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('habit','daily','todo')),
  difficulty text not null check (difficulty in ('trivial','easy','medium','hard')),
  base_points integer not null,
  schedule text,
  science_tag text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  completed_on date not null,
  points_earned integer not null,
  streak_at_time integer not null
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  budget_group text not null check (budget_group in ('needs','wants','savings'))
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id),
  amount numeric not null,
  spent_on date not null,
  note text,
  is_recurring boolean default false,
  -- template this row was auto-generated from (null for templates / one-offs)
  recurring_of uuid references expenses(id) on delete set null
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month text not null,            -- 'YYYY-MM'
  limit_amount numeric not null
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0
);

-- Per-user key/value settings, e.g. 'income:2026-09' → '120000'
create table if not exists settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text not null,
  primary key (user_id, key)
);

-- Indexes for the per-user lookups every screen does
create index if not exists habits_user_idx      on habits (user_id);
create index if not exists habit_logs_user_idx  on habit_logs (user_id, habit_id, completed_on);
create index if not exists categories_user_idx  on categories (user_id);
create index if not exists expenses_user_idx    on expenses (user_id, spent_on);
create index if not exists budgets_user_idx     on budgets (user_id, month);
create index if not exists goals_user_idx       on goals (user_id);

-- Row Level Security: each user sees and edits only their own rows.
-- auth.uid() is the signed-in user's id, taken from the request's JWT.
alter table habits     enable row level security;
alter table habit_logs enable row level security;
alter table categories enable row level security;
alter table expenses   enable row level security;
alter table budgets    enable row level security;
alter table goals      enable row level security;
alter table settings   enable row level security;

create policy "Users manage their own habits"     on habits     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own habit_logs" on habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own categories" on categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own expenses"   on expenses   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own budgets"    on budgets    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own goals"      on goals      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own settings"   on settings   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
