# HabEx — Architecture

Single-user, offline-first Android app. A React web app runs inside a Capacitor
WebView; all data lives in an on-device SQLite database. No backend.

## Layers

```mermaid
flowchart TB
  subgraph UI["UI layer — React 19 + Tailwind (src/App.tsx, src/features/*)"]
    Today[TodayScreen]
    Habits[HabitList / HabitForm / HabitRow]
    HabitDash[HabitDashboard]
    Expenses[ExpenseList / ExpenseForm / CategoryManager]
    ExpDash[ExpenseDashboard]
    Budgets[BudgetSettings]
    BudDash[BudgetDashboard]
    Settings[SettingsScreen / DataSection]
    Shell[LockGate · Toaster · LevelUp · ViewToggle]
  end

  subgraph Hooks["Hooks — load, expose actions, reload after every write"]
    useHabits
    useHabitStats
    useExpenses
    useExpenseStats
    useBudgets
    useTodayMoney
  end

  subgraph Domain["Pure domain logic — no I/O, unit-tested (vitest)"]
    points[lib/points.ts<br/>base points · streak bonus · level]
    streak[habits/streak.ts<br/>daily / weekdays / weekly]
    hstats[dashboard/habitStats.ts<br/>heatmap · weekly %]
    recurring[expenses/recurring.ts<br/>monthly copies]
    overspend[budgets/overspend.ts<br/>1.3× 3-month avg · zero-based]
    estats[dashboard/expenseStats.ts<br/>pie · 50/30/20]
    bstats[dashboard/budgetStats.ts<br/>allocation · plan]
    dates[lib/dates.ts]
  end

  subgraph Repos["Repositories — the only files with SQL"]
    habitsRepo
    expensesRepo
    categoriesRepo
    budgetsRepo
  end

  subgraph DB["Data access — src/db"]
    db["db.ts<br/>initDb · query · run · runBatch · migrations"]
    schema["schema.sql<br/>habits · habit_logs · categories · expenses · budgets · goals · settings"]
  end

  subgraph Platform["Platform services — src/lib"]
    theme[theme.ts]
    appLock[appLock.ts]
    reminders[reminders.ts]
    backup[backup.ts]
    celebrate[celebrate.ts]
  end

  subgraph Native["Capacitor bridge → native Android"]
    sqlite["@capacitor-community/sqlite<br/>native SQLite (jeep-sqlite + IndexedDB on web)"]
    bio["@aparajita/capacitor-biometric-auth<br/>BiometricPrompt + device credential"]
    notif["@capacitor/local-notifications"]
    fs["@capacitor/filesystem · @capacitor/share"]
    app["@capacitor/app<br/>foreground/background events"]
  end

  UI --> Hooks
  Hooks --> Repos
  Hooks --> Domain
  Repos --> Domain
  Repos --> db
  db --> schema
  db --> sqlite
  Shell --> appLock --> bio
  Shell --> reminders --> notif
  Shell --> app
  Settings --> backup --> fs
  backup --> db
  Settings --> theme
  Habits --> celebrate
```

## Key rules

| Rule | Why |
|---|---|
| Components never touch SQL; hooks never touch SQL. Only `*Repo.ts` files do. | One place to change when the schema changes. |
| Every hook action is *write → reload*. | UI can never drift from the database. |
| Formulas and date maths are pure functions with tests. | Off-by-one errors in streaks/points would silently corrupt data. |
| Dates are local `YYYY-MM-DD` strings, never `toISOString()`. | UTC would shift late-evening completions to the next day. |
| `schema.sql` uses `IF NOT EXISTS`; later columns go through `runMigrations` in `db.ts`. | Safe to run on every launch, on old and new installs. |
| Colours are semantic tokens (`bg-surface`, `text-ink`) defined once in `index.css`. | Dark mode is a variable swap, not per-component work. |

## Data flow example — completing a habit

```mermaid
sequenceDiagram
  actor U as User
  participant R as HabitRow
  participant H as useHabits
  participant Rp as habitsRepo
  participant S as streak.ts / points.ts
  participant D as db.ts → SQLite
  participant C as Toaster / confetti

  U->>R: tap ✓
  R->>H: complete(habit, origin)
  H->>Rp: completeHabit(habit)
  Rp->>D: SELECT logs for habit
  Rp->>S: computeStreak(dates) → pointsEarned(difficulty, streak)
  Rp->>D: INSERT habit_logs
  H->>Rp: listHabitsWithStatus()
  Rp-->>H: fresh list
  H->>C: burst, "+12 XP", level-up / all-done
```

## Build & release

```
npm run dev          Vite dev server (web, IndexedDB-backed SQLite)
npm test             vitest — pure domain logic
npm run apk          debug APK   → android/app/build/outputs/apk/debug/
npm run apk:release  signed APK  → android/app/build/outputs/apk/release/
```

Signing reads `android/keystore.properties` (git-ignored). Bump `versionCode`
and `versionName` in `android/app/build.gradle` for every release.
