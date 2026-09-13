/**
 * DataClient backed by the on-device SQLite database (Android) or the
 * jeep-sqlite/IndexedDB fallback (browser dev).
 *
 * Pure extraction of the former feature repos — every query is unchanged:
 *   features/habits/habitsRepo.ts, features/expenses/{expensesRepo,categoriesRepo}.ts,
 *   features/budgets/budgetsRepo.ts, and the table read/write half of lib/backup.ts.
 */
import { initDb, newId, query, run, runBatch } from '../db/db'
import { missingOccurrences } from '../features/expenses/recurring'
import type { BudgetGroup, Category, Expense, ExpenseInput, ExpenseWithCategory } from '../features/expenses/types'
import { computeStreak } from '../features/habits/streak'
import type { Habit, HabitInput, HabitLog, HabitWithStatus } from '../features/habits/types'
import { addMonths, monthStr, todayStr, type DateStr } from '../lib/dates'
import { BASE_POINTS, pointsEarned } from '../lib/points'
import type { BudgetInput, DataClient, DataSnapshot, Goal } from './DataClient'

/** Seeded on first launch so the expense form has something to pick from. */
const DEFAULT_CATEGORIES: { name: string; budget_group: BudgetGroup }[] = [
  { name: 'Rent / housing', budget_group: 'needs' },
  { name: 'Groceries', budget_group: 'needs' },
  { name: 'Utilities & bills', budget_group: 'needs' },
  { name: 'Transport', budget_group: 'needs' },
  { name: 'Health', budget_group: 'needs' },
  { name: 'Eating out', budget_group: 'wants' },
  { name: 'Entertainment', budget_group: 'wants' },
  { name: 'Shopping', budget_group: 'wants' },
  { name: 'Savings', budget_group: 'savings' },
  { name: 'Emergency fund', budget_group: 'savings' },
]

const SELECT_WITH_CATEGORY = `
  SELECT e.*, c.name AS category_name, c.budget_group
  FROM expenses e JOIN categories c ON c.id = e.category_id`

/** Backup tables and columns. Insert order respects foreign keys; delete order is the reverse. */
const BACKUP_TABLES: Record<string, string[]> = {
  categories: ['id', 'name', 'budget_group'],
  habits: ['id', 'name', 'type', 'difficulty', 'base_points', 'schedule', 'science_tag', 'active', 'created_at'],
  habit_logs: ['id', 'habit_id', 'completed_on', 'points_earned', 'streak_at_time'],
  expenses: ['id', 'category_id', 'amount', 'spent_on', 'note', 'is_recurring', 'recurring_of'],
  budgets: ['id', 'category_id', 'month', 'limit_amount'],
  goals: ['id', 'name', 'target_amount', 'current_amount'],
  settings: ['key', 'value'],
}

async function getHabitById(id: string): Promise<Habit> {
  const [habit] = await query<Habit>('SELECT * FROM habits WHERE id = ?', [id])
  if (!habit) throw new Error(`Habit ${id} not found`)
  return habit
}

export const sqliteDataClient: DataClient = {
  async init() {
    await initDb()
  },

  // ── Habits ────────────────────────────────────────────────────────────────

  async getHabits(includeArchived = false) {
    return query<Habit>(
      `SELECT * FROM habits ${includeArchived ? '' : 'WHERE active = 1'} ORDER BY created_at ASC`,
    )
  },

  /** Habits joined with today's completion state, current streak and lifetime points. */
  async getHabitsWithStatus(today: DateStr = todayStr()): Promise<HabitWithStatus[]> {
    const [habits, logs] = await Promise.all([sqliteDataClient.getHabits(), sqliteDataClient.getAllHabitLogs()])
    const byHabit = new Map<string, HabitLog[]>()
    for (const l of logs) {
      const arr = byHabit.get(l.habit_id) ?? []
      arr.push(l)
      byHabit.set(l.habit_id, arr)
    }
    return habits.map((h) => {
      const hl = byHabit.get(h.id) ?? []
      return {
        ...h,
        completedToday: hl.some((l) => l.completed_on === today),
        streak: computeStreak(hl.map((l) => l.completed_on), h.schedule, today),
        totalPoints: hl.reduce((sum, l) => sum + l.points_earned, 0),
      }
    })
  },

  async addHabit(input: HabitInput): Promise<Habit> {
    const habit: Habit = {
      id: newId(),
      name: input.name.trim(),
      type: input.type,
      difficulty: input.difficulty,
      base_points: BASE_POINTS[input.difficulty],
      schedule: input.type === 'todo' ? null : input.schedule,
      science_tag: input.science_tag?.trim() || null,
      active: 1,
      created_at: new Date().toISOString(),
    }
    await run(
      `INSERT INTO habits (id, name, type, difficulty, base_points, schedule, science_tag, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [habit.id, habit.name, habit.type, habit.difficulty, habit.base_points, habit.schedule,
       habit.science_tag, habit.active, habit.created_at],
    )
    return habit
  },

  async updateHabit(id: string, input: HabitInput): Promise<void> {
    await run(
      `UPDATE habits SET name = ?, type = ?, difficulty = ?, base_points = ?, schedule = ?, science_tag = ?
       WHERE id = ?`,
      [input.name.trim(), input.type, input.difficulty, BASE_POINTS[input.difficulty],
       input.type === 'todo' ? null : input.schedule, input.science_tag?.trim() || null, id],
    )
  },

  /** Soft delete: keeps the logs (and the points they earned). */
  async archiveHabit(id: string): Promise<void> {
    await run('UPDATE habits SET active = 0 WHERE id = ?', [id])
  },

  /** Hard delete: removes the habit and its logs. Points earned are lost. */
  async deleteHabit(id: string): Promise<void> {
    await run('DELETE FROM habit_logs WHERE habit_id = ?', [id])
    await run('DELETE FROM habits WHERE id = ?', [id])
  },

  /**
   * Mark a habit done for `date` (default today). One completion per day: if a
   * log already exists it's returned unchanged. Computes the streak *including*
   * this completion and the points from the brief's formula, then writes the log.
   * A 'todo' is archived on completion — it's a one-off.
   */
  async logHabitComplete(habitId: string, date: DateStr = todayStr()): Promise<HabitLog> {
    const habit = await getHabitById(habitId)
    const existing = await query<HabitLog>(
      'SELECT * FROM habit_logs WHERE habit_id = ? AND completed_on = ?',
      [habit.id, date],
    )
    if (existing[0]) return existing[0]

    const prior = await sqliteDataClient.getHabitLogs(habit.id)
    const dates = prior.map((l) => l.completed_on)
    dates.push(date)
    const streak = computeStreak(dates, habit.schedule, date)

    const log: HabitLog = {
      id: newId(),
      habit_id: habit.id,
      completed_on: date,
      points_earned: pointsEarned(habit.difficulty, streak),
      streak_at_time: streak,
    }
    await run(
      'INSERT INTO habit_logs (id, habit_id, completed_on, points_earned, streak_at_time) VALUES (?, ?, ?, ?, ?)',
      [log.id, log.habit_id, log.completed_on, log.points_earned, log.streak_at_time],
    )
    if (habit.type === 'todo') await sqliteDataClient.archiveHabit(habit.id)
    return log
  },

  /** Undo a completion (mis-tap). Re-activates a todo that was auto-archived. */
  async undoHabitComplete(habitId: string, date: DateStr = todayStr()): Promise<void> {
    const habit = await getHabitById(habitId)
    await run('DELETE FROM habit_logs WHERE habit_id = ? AND completed_on = ?', [habit.id, date])
    if (habit.type === 'todo') await run('UPDATE habits SET active = 1 WHERE id = ?', [habit.id])
  },

  async getHabitLogs(habitId: string, range?: { from: DateStr; to: DateStr }): Promise<HabitLog[]> {
    if (range) {
      return query<HabitLog>(
        'SELECT * FROM habit_logs WHERE habit_id = ? AND completed_on >= ? AND completed_on <= ? ORDER BY completed_on ASC',
        [habitId, range.from, range.to],
      )
    }
    return query<HabitLog>(
      'SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY completed_on ASC',
      [habitId],
    )
  },

  async getAllHabitLogs(): Promise<HabitLog[]> {
    return query<HabitLog>('SELECT * FROM habit_logs ORDER BY completed_on ASC')
  },

  /** Sum of every point ever earned — the input to levelFromPoints(). */
  async getTotalPoints(): Promise<number> {
    const rows = await query<{ total: number | null }>('SELECT SUM(points_earned) AS total FROM habit_logs')
    return rows[0]?.total ?? 0
  },

  // ── Categories ────────────────────────────────────────────────────────────

  async getCategories(): Promise<Category[]> {
    return query<Category>(
      `SELECT * FROM categories
       ORDER BY CASE budget_group WHEN 'needs' THEN 0 WHEN 'wants' THEN 1 ELSE 2 END, name`,
    )
  },

  async ensureDefaultCategories(): Promise<void> {
    const [{ n }] = await query<{ n: number }>('SELECT COUNT(*) AS n FROM categories')
    if (n > 0) return
    for (const c of DEFAULT_CATEGORIES) await sqliteDataClient.addCategory(c)
  },

  async addCategory(input: Omit<Category, 'id'>): Promise<Category> {
    const cat: Category = { id: newId(), name: input.name.trim(), budget_group: input.budget_group }
    await run('INSERT INTO categories (id, name, budget_group) VALUES (?, ?, ?)', [cat.id, cat.name, cat.budget_group])
    return cat
  },

  async updateCategory(id: string, input: Omit<Category, 'id'>): Promise<void> {
    await run('UPDATE categories SET name = ?, budget_group = ? WHERE id = ?', [input.name.trim(), input.budget_group, id])
  },

  /** How many expenses reference a category — delete is refused while > 0. */
  async getCategoryUsage(id: string): Promise<number> {
    const [{ n }] = await query<{ n: number }>('SELECT COUNT(*) AS n FROM expenses WHERE category_id = ?', [id])
    return n
  },

  async deleteCategory(id: string): Promise<void> {
    if ((await sqliteDataClient.getCategoryUsage(id)) > 0) throw new Error('Category is in use by expenses; reassign them first.')
    await run('DELETE FROM budgets WHERE category_id = ?', [id])
    await run('DELETE FROM categories WHERE id = ?', [id])
  },

  // ── Expenses ──────────────────────────────────────────────────────────────

  async getExpenses(month: string): Promise<ExpenseWithCategory[]> {
    return query<ExpenseWithCategory>(
      `${SELECT_WITH_CATEGORY} WHERE substr(e.spent_on, 1, 7) = ? ORDER BY e.spent_on DESC, e.rowid DESC`,
      [month],
    )
  },

  async getExpense(id: string): Promise<Expense | undefined> {
    return (await query<Expense>('SELECT * FROM expenses WHERE id = ?', [id]))[0]
  },

  async addExpense(input: ExpenseInput): Promise<Expense> {
    const e: Expense = {
      id: newId(),
      category_id: input.category_id,
      amount: input.amount,
      spent_on: input.spent_on,
      note: input.note?.trim() || null,
      is_recurring: input.is_recurring ? 1 : 0,
      recurring_of: null,
    }
    await run(
      `INSERT INTO expenses (id, category_id, amount, spent_on, note, is_recurring, recurring_of)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [e.id, e.category_id, e.amount, e.spent_on, e.note, e.is_recurring, e.recurring_of],
    )
    return e
  },

  /**
   * Editing a template changes future copies (they're generated from it);
   * editing a copy changes only that month. Turning recurring off on a copy
   * detaches it from its template.
   */
  async updateExpense(id: string, input: ExpenseInput): Promise<void> {
    await run(
      `UPDATE expenses SET category_id = ?, amount = ?, spent_on = ?, note = ?, is_recurring = ?,
         recurring_of = CASE WHEN ? = 0 THEN NULL ELSE recurring_of END
       WHERE id = ?`,
      [input.category_id, input.amount, input.spent_on, input.note?.trim() || null,
       input.is_recurring ? 1 : 0, input.is_recurring ? 1 : 0, id],
    )
  },

  /** Deleting a template leaves its already-generated copies as ordinary expenses. */
  async deleteExpense(id: string): Promise<void> {
    await run('UPDATE expenses SET recurring_of = NULL, is_recurring = 0 WHERE recurring_of = ?', [id])
    await run('DELETE FROM expenses WHERE id = ?', [id])
  },

  /**
   * Create this month's (and any skipped months') copies of every recurring
   * template. Called on load so the month view is always complete.
   * Returns the number of rows inserted.
   */
  async materializeRecurring(today = todayStr()): Promise<number> {
    const currentMonth = monthStr(today)
    const templates = await query<Expense>(
      'SELECT * FROM expenses WHERE is_recurring = 1 AND recurring_of IS NULL',
    )
    let inserted = 0
    for (const t of templates) {
      const copies = await query<{ month: string }>(
        'SELECT substr(spent_on, 1, 7) AS month FROM expenses WHERE recurring_of = ?',
        [t.id],
      )
      for (const occ of missingOccurrences(t, copies.map((c) => c.month), currentMonth)) {
        await run(
          `INSERT INTO expenses (id, category_id, amount, spent_on, note, is_recurring, recurring_of)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          [newId(), t.category_id, t.amount, occ.spent_on, t.note, t.id],
        )
        inserted++
      }
    }
    return inserted
  },

  /** Month total and per-category totals — the numbers the header and budgets need. */
  async getMonthTotals(month: string): Promise<{ total: number; byCategory: Map<string, number> }> {
    const rows = await query<{ category_id: string; total: number }>(
      `SELECT category_id, SUM(amount) AS total FROM expenses
       WHERE substr(spent_on, 1, 7) = ? GROUP BY category_id`,
      [month],
    )
    const byCategory = new Map(rows.map((r) => [r.category_id, r.total]))
    return { total: rows.reduce((s, r) => s + r.total, 0), byCategory }
  },

  /** Total spent on one day. */
  async getDaySpend(date: string): Promise<number> {
    const rows = await query<{ total: number | null }>('SELECT SUM(amount) AS total FROM expenses WHERE spent_on = ?', [date])
    return rows[0]?.total ?? 0
  },

  // ── Budgets ───────────────────────────────────────────────────────────────

  /** category_id → limit_amount for one month. */
  async getBudgets(month: string): Promise<Map<string, number>> {
    const rows = await query<{ category_id: string; limit_amount: number }>(
      'SELECT category_id, limit_amount FROM budgets WHERE month = ?',
      [month],
    )
    return new Map(rows.map((r) => [r.category_id, r.limit_amount]))
  },

  /** Upsert one category's limit for a month; a limit of 0 removes the row. */
  async setBudget({ category_id, month, limit_amount }: BudgetInput): Promise<void> {
    await run('DELETE FROM budgets WHERE category_id = ? AND month = ?', [category_id, month])
    if (limit_amount > 0) {
      await run(
        'INSERT INTO budgets (id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)',
        [newId(), category_id, month, limit_amount],
      )
    }
  },

  /** Copy every allocation from one month to another (replacing the target's). */
  async copyBudgets(fromMonth: string, toMonth: string): Promise<number> {
    const src = await sqliteDataClient.getBudgets(fromMonth)
    await run('DELETE FROM budgets WHERE month = ?', [toMonth])
    for (const [categoryId, limit] of src) {
      await run(
        'INSERT INTO budgets (id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)',
        [newId(), categoryId, toMonth, limit],
      )
    }
    return src.size
  },

  /** The most recent month before `month` that has any budgets, if any. */
  async getPreviousBudgetMonth(month: string): Promise<string | null> {
    const rows = await query<{ month: string }>(
      'SELECT month FROM budgets WHERE month < ? ORDER BY month DESC LIMIT 1',
      [month],
    )
    return rows[0]?.month ?? null
  },

  async getIncome(month: string): Promise<number> {
    const rows = await query<{ value: string }>('SELECT value FROM settings WHERE key = ?', [`income:${month}`])
    return rows[0] ? Number(rows[0].value) : 0
  },

  async setIncome(month: string, amount: number): Promise<void> {
    await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [`income:${month}`, String(amount)])
  },

  /**
   * Spend per category for `month` and the `historyMonths` before it.
   * Returns category_id → [current, prev1, prev2, ...] with 0 for empty months,
   * which is exactly the shape overspendCheck wants.
   */
  async getSpendHistory(month: string, historyMonths = 3): Promise<Map<string, number[]>> {
    const months = Array.from({ length: historyMonths + 1 }, (_, i) => addMonths(month, -i))
    const rows = await query<{ category_id: string; month: string; total: number }>(
      `SELECT category_id, substr(spent_on, 1, 7) AS month, SUM(amount) AS total
       FROM expenses WHERE substr(spent_on, 1, 7) IN (${months.map(() => '?').join(',')})
       GROUP BY category_id, month`,
      months,
    )
    const out = new Map<string, number[]>()
    for (const r of rows) {
      const arr = out.get(r.category_id) ?? new Array<number>(months.length).fill(0)
      arr[months.indexOf(r.month)] = r.total
      out.set(r.category_id, arr)
    }
    return out
  },

  // ── Goals ─────────────────────────────────────────────────────────────────

  async getGoals(): Promise<Goal[]> {
    return query<Goal>('SELECT * FROM goals ORDER BY name')
  },

  // ── Backup ────────────────────────────────────────────────────────────────

  async exportData(): Promise<DataSnapshot> {
    const tables: DataSnapshot = {}
    for (const [name, cols] of Object.entries(BACKUP_TABLES)) {
      tables[name] = await query(`SELECT ${cols.join(', ')} FROM ${name}`)
    }
    return tables
  },

  /** Replace ALL current data with the snapshot, in one transaction. */
  async importData(snapshot: DataSnapshot): Promise<void> {
    const set: { statement: string; values?: unknown[] }[] = []
    const names = Object.keys(BACKUP_TABLES)
    for (const name of [...names].reverse()) set.push({ statement: `DELETE FROM ${name}` })
    for (const name of names) {
      const cols = BACKUP_TABLES[name]
      let rows = snapshot[name] ?? []
      // expenses.recurring_of points at another expense: templates must go in first.
      if (name === 'expenses') rows = [...rows].sort((a, z) => Number(a.recurring_of != null) - Number(z.recurring_of != null))
      for (const row of rows) {
        set.push({
          statement: `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          values: cols.map((c) => (row[c] === undefined ? null : row[c])),
        })
      }
    }
    await runBatch(set)
  },
}
