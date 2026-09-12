# Prompt for generating the HabEx architecture diagram

Paste everything below the line into ChatGPT (image generation) or any
diagramming tool. Adjust style words at the end to taste.

---

Create a clean, professional software architecture diagram (landscape, 16:9,
high resolution, flat design, light background, readable labels) for a mobile
app called **HabEx** — a single-user, offline-first Android habit and expense
tracker. Draw it as stacked horizontal layers, top to bottom, with arrows
showing that each layer only talks to the one below it. Use one colour per
layer. Put the app name and the tagline "offline-first · React + Capacitor +
SQLite" as a title.

**Layer 1 (top) — UI, React 19 + TypeScript + Tailwind CSS.** Show a phone
frame with a bottom tab bar containing four tabs: Today, Habits, Expenses,
Budgets, plus a Settings gear. Next to it list the screens: Today screen
(habits due + money summary), Habit list & form, Habit dashboard (level/XP,
streak heatmap, weekly % chart), Expense list & form, Category manager,
Expense dashboard (category pie, budget vs actual, 50/30/20), Budget
allocation (zero-based), Budget dashboard, Settings (theme, app lock,
reminders, backup/restore). Also show three cross-cutting shell components:
LockGate, Toaster/celebrations (confetti), Level-up overlay.

**Layer 2 — React hooks (state + actions).** Boxes: useHabits, useHabitStats,
useExpenses, useExpenseStats, useBudgets, useTodayMoney. Caption: "load data,
expose actions, reload after every write".

**Layer 3 — Pure domain logic (unit-tested, no I/O).** Boxes: points & level
formulas, streak calculator (daily / weekdays / weekly), recurring-expense
generator, overspend check (1.3× trailing 3-month average), zero-based
budgeting, dashboard statistics (heatmap, weekly %, pie, 50/30/20, allocation),
date helpers. Caption: "vitest — 48 tests".

**Layer 4 — Repositories (the only code containing SQL).** Boxes: habitsRepo,
expensesRepo, categoriesRepo, budgetsRepo.

**Layer 5 — Data access.** One box "db.ts — initDb, query, run, runBatch
(transactions), migrations" and a database cylinder labelled "SQLite —
schema.sql: habits, habit_logs, categories, expenses, budgets, goals,
settings".

**Layer 6 (bottom) — Capacitor bridge → native Android plugins.** Boxes:
SQLite plugin (native SQLite on device; jeep-sqlite + IndexedDB fallback in
the browser during development), Biometric auth (fingerprint with device
PIN fallback), Local notifications (12-hour inactivity reminder), Filesystem
+ Share (JSON backup to Documents/HabEx), App lifecycle events. Under this
layer draw an Android robot icon and the label "Android WebView — installed
as a signed APK".

**Side column (right) — Platform services:** theme (system/light/dark, CSS
tokens), app lock, reminders, backup/restore, celebrations. Draw thin arrows
from these to the native plugins they use.

**Callout box (bottom-left) — Design rules:** "Components and hooks never
contain SQL", "Every action = write then reload", "Dates are local
YYYY-MM-DD strings", "Schema changes via idempotent migrations", "Colours are
semantic tokens → dark mode is a variable swap".

**Small data-flow inset (bottom-right)** titled "Completing a habit": tap ✓ →
useHabits.complete → habitsRepo.completeHabit → computeStreak + pointsEarned
→ INSERT habit_logs → reload → confetti + "+12 XP" toast (level-up overlay
if a level boundary is crossed).

Style: minimal, modern, consistent rounded rectangles, sans-serif font, no
gradients, no 3D, generous spacing, arrows with subtle heads, everything
legible at a glance. Do not invent components that are not listed.
