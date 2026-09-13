/**
 * DataClient backed by Supabase (Postgres + Auth + RLS) — the web build.
 *
 * Same contract and the same row shapes as the SQLite client. Differences
 * live entirely in here: booleans ↔ 0/1, numeric strings → numbers, user_id
 * stamped on writes, and aggregation done in JS (REST has no GROUP BY).
 */
import { missingOccurrences } from '../features/expenses/recurring'
import type { BudgetGroup, Category, Expense, ExpenseInput, ExpenseWithCategory } from '../features/expenses/types'
import { computeStreak } from '../features/habits/streak'
import type { Habit, HabitInput, HabitLog, HabitWithStatus } from '../features/habits/types'
import { addMonths, monthStr, todayStr, type DateStr } from '../lib/dates'
import { BASE_POINTS, pointsEarned } from '../lib/points'
import type { BudgetInput, DataClient, DataSnapshot, Goal } from './DataClient'
import { withStatus } from './habitStatus'
import { supabase } from './supabase'

/** Same defaults as the SQLite client. */
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

const GROUP_ORDER: Record<BudgetGroup, number> = { needs: 0, wants: 1, savings: 2 }

let userId: string | null = null
const newId = () => crypto.randomUUID()

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/** First and last day of a 'YYYY-MM' month, for range filters on DATE columns. */
function monthRange(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${addMonths(month, 1)}-01` } // to is exclusive
}

// ── Row mappers: Postgres row → the shapes the UI expects ────────────────────
type DbHabit = Omit<Habit, 'active'> & { active: boolean; user_id: string }
type DbExpense = Omit<Expense, 'is_recurring' | 'amount'> & { is_recurring: boolean; amount: number | string; user_id: string }

const toHabit = (r: DbHabit): Habit => ({
  id: r.id, name: r.name, type: r.type, difficulty: r.difficulty, base_points: r.base_points,
  schedule: r.schedule, science_tag: r.science_tag, active: r.active ? 1 : 0, created_at: r.created_at,
})
const toExpense = (r: DbExpense): Expense => ({
  id: r.id, category_id: r.category_id, amount: Number(r.amount), spent_on: r.spent_on,
  note: r.note, is_recurring: r.is_recurring ? 1 : 0, recurring_of: r.recurring_of,
})

async function requireHabit(id: string): Promise<Habit> {
  const { data, error } = await supabase().from('habits').select('*').eq('id', id).maybeSingle()
  fail(error)
  if (!data) throw new Error(`Habit ${id} not found`)
  return toHabit(data as DbHabit)
}

async function expensesBetween(from: string, to: string): Promise<Expense[]> {
  const { data, error } = await supabase().from('expenses').select('*').gte('spent_on', from).lt('spent_on', to)
  fail(error)
  return (data as DbExpense[]).map(toExpense)
}

export const supabaseDataClient: DataClient = {
  async init() {
    const { data, error } = await supabase().auth.getSession()
    fail(error)
    userId = data.session?.user.id ?? null
    if (!userId) throw new Error('Not signed in')
  },

  // ── Habits ────────────────────────────────────────────────────────────────

  async getHabits(includeArchived = false) {
    let q = supabase().from('habits').select('*').order('created_at', { ascending: true })
    if (!includeArchived) q = q.eq('active', true)
    const { data, error } = await q
    fail(error)
    return (data as DbHabit[]).map(toHabit)
  },

  async getHabitsWithStatus(today: DateStr = todayStr()): Promise<HabitWithStatus[]> {
    const [habits, logs] = await Promise.all([supabaseDataClient.getHabits(), supabaseDataClient.getAllHabitLogs()])
    return withStatus(habits, logs, today)
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
    const { error } = await supabase().from('habits').insert({ ...habit, active: true, user_id: userId })
    fail(error)
    return habit
  },

  async updateHabit(id: string, input: HabitInput): Promise<void> {
    const { error } = await supabase().from('habits').update({
      name: input.name.trim(), type: input.type, difficulty: input.difficulty,
      base_points: BASE_POINTS[input.difficulty],
      schedule: input.type === 'todo' ? null : input.schedule,
      science_tag: input.science_tag?.trim() || null,
    }).eq('id', id)
    fail(error)
  },

  async archiveHabit(id: string): Promise<void> {
    const { error } = await supabase().from('habits').update({ active: false }).eq('id', id)
    fail(error)
  },

  async deleteHabit(id: string): Promise<void> {
    // habit_logs cascade on delete in the Postgres schema
    const { error } = await supabase().from('habits').delete().eq('id', id)
    fail(error)
  },

  async logHabitComplete(habitId: string, date: DateStr = todayStr()): Promise<HabitLog> {
    const habit = await requireHabit(habitId)
    const prior = await supabaseDataClient.getHabitLogs(habit.id)
    const existing = prior.find((l) => l.completed_on === date)
    if (existing) return existing

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
    const { error } = await supabase().from('habit_logs').insert({ ...log, user_id: userId })
    fail(error)
    if (habit.type === 'todo') await supabaseDataClient.archiveHabit(habit.id)
    return log
  },

  async undoHabitComplete(habitId: string, date: DateStr = todayStr()): Promise<void> {
    const habit = await requireHabit(habitId)
    const { error } = await supabase().from('habit_logs').delete().eq('habit_id', habit.id).eq('completed_on', date)
    fail(error)
    if (habit.type === 'todo') {
      const { error: e2 } = await supabase().from('habits').update({ active: true }).eq('id', habit.id)
      fail(e2)
    }
  },

  async getHabitLogs(habitId: string, range?: { from: DateStr; to: DateStr }): Promise<HabitLog[]> {
    let q = supabase().from('habit_logs').select('*').eq('habit_id', habitId).order('completed_on', { ascending: true })
    if (range) q = q.gte('completed_on', range.from).lte('completed_on', range.to)
    const { data, error } = await q
    fail(error)
    return data as HabitLog[]
  },

  async getAllHabitLogs(): Promise<HabitLog[]> {
    const { data, error } = await supabase().from('habit_logs').select('*').order('completed_on', { ascending: true })
    fail(error)
    return data as HabitLog[]
  },

  async getTotalPoints(): Promise<number> {
    const { data, error } = await supabase().from('habit_logs').select('points_earned')
    fail(error)
    return (data as { points_earned: number }[]).reduce((s, r) => s + r.points_earned, 0)
  },

  // ── Categories ────────────────────────────────────────────────────────────

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase().from('categories').select('id, name, budget_group')
    fail(error)
    return (data as Category[]).sort(
      (a, b) => GROUP_ORDER[a.budget_group] - GROUP_ORDER[b.budget_group] || a.name.localeCompare(b.name),
    )
  },

  async ensureDefaultCategories(): Promise<void> {
    const { count, error } = await supabase().from('categories').select('id', { count: 'exact', head: true })
    fail(error)
    if ((count ?? 0) > 0) return
    const { error: e2 } = await supabase().from('categories').insert(
      DEFAULT_CATEGORIES.map((c) => ({ id: newId(), ...c, user_id: userId })),
    )
    fail(e2)
  },

  async addCategory(input: Omit<Category, 'id'>): Promise<Category> {
    const cat: Category = { id: newId(), name: input.name.trim(), budget_group: input.budget_group }
    const { error } = await supabase().from('categories').insert({ ...cat, user_id: userId })
    fail(error)
    return cat
  },

  async updateCategory(id: string, input: Omit<Category, 'id'>): Promise<void> {
    const { error } = await supabase().from('categories').update({ name: input.name.trim(), budget_group: input.budget_group }).eq('id', id)
    fail(error)
  },

  async getCategoryUsage(id: string): Promise<number> {
    const { count, error } = await supabase().from('expenses').select('id', { count: 'exact', head: true }).eq('category_id', id)
    fail(error)
    return count ?? 0
  },

  async deleteCategory(id: string): Promise<void> {
    if ((await supabaseDataClient.getCategoryUsage(id)) > 0) throw new Error('Category is in use by expenses; reassign them first.')
    // budgets cascade on delete in the Postgres schema
    const { error } = await supabase().from('categories').delete().eq('id', id)
    fail(error)
  },

  // ── Expenses ──────────────────────────────────────────────────────────────

  async getExpenses(month: string): Promise<ExpenseWithCategory[]> {
    const { from, to } = monthRange(month)
    const { data, error } = await supabase()
      .from('expenses')
      .select('*, categories(name, budget_group)')
      .gte('spent_on', from).lt('spent_on', to)
      .order('spent_on', { ascending: false })
    fail(error)
    type Row = DbExpense & { categories: { name: string; budget_group: BudgetGroup } | null }
    return (data as Row[]).map((r) => ({
      ...toExpense(r),
      category_name: r.categories?.name ?? '',
      budget_group: r.categories?.budget_group ?? 'wants',
    }))
  },

  async getExpense(id: string): Promise<Expense | undefined> {
    const { data, error } = await supabase().from('expenses').select('*').eq('id', id).maybeSingle()
    fail(error)
    return data ? toExpense(data as DbExpense) : undefined
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
    const { error } = await supabase().from('expenses').insert({ ...e, is_recurring: !!input.is_recurring, user_id: userId })
    fail(error)
    return e
  },

  async updateExpense(id: string, input: ExpenseInput): Promise<void> {
    const patch: Record<string, unknown> = {
      category_id: input.category_id, amount: input.amount, spent_on: input.spent_on,
      note: input.note?.trim() || null, is_recurring: !!input.is_recurring,
    }
    if (!input.is_recurring) patch.recurring_of = null // detach a copy
    const { error } = await supabase().from('expenses').update(patch).eq('id', id)
    fail(error)
  },

  async deleteExpense(id: string): Promise<void> {
    const { error: e1 } = await supabase().from('expenses').update({ recurring_of: null, is_recurring: false }).eq('recurring_of', id)
    fail(e1)
    const { error: e2 } = await supabase().from('expenses').delete().eq('id', id)
    fail(e2)
  },

  async materializeRecurring(today = todayStr()): Promise<number> {
    const currentMonth = monthStr(today)
    const { data, error } = await supabase().from('expenses').select('*').eq('is_recurring', true).is('recurring_of', null)
    fail(error)
    const templates = (data as DbExpense[]).map(toExpense)
    if (templates.length === 0) return 0

    const { data: copyRows, error: e2 } = await supabase().from('expenses').select('recurring_of, spent_on').not('recurring_of', 'is', null)
    fail(e2)
    const copiesByTemplate = new Map<string, string[]>()
    for (const c of copyRows as { recurring_of: string; spent_on: string }[]) {
      copiesByTemplate.set(c.recurring_of, [...(copiesByTemplate.get(c.recurring_of) ?? []), monthStr(c.spent_on)])
    }

    const inserts = []
    for (const t of templates) {
      for (const occ of missingOccurrences(t, copiesByTemplate.get(t.id) ?? [], currentMonth)) {
        inserts.push({
          id: newId(), category_id: t.category_id, amount: t.amount, spent_on: occ.spent_on,
          note: t.note, is_recurring: true, recurring_of: t.id, user_id: userId,
        })
      }
    }
    if (inserts.length) {
      const { error: e3 } = await supabase().from('expenses').insert(inserts)
      fail(e3)
    }
    return inserts.length
  },

  async getMonthTotals(month: string): Promise<{ total: number; byCategory: Map<string, number> }> {
    const { from, to } = monthRange(month)
    const rows = await expensesBetween(from, to)
    const byCategory = new Map<string, number>()
    for (const r of rows) byCategory.set(r.category_id, (byCategory.get(r.category_id) ?? 0) + r.amount)
    return { total: rows.reduce((s, r) => s + r.amount, 0), byCategory }
  },

  async getDaySpend(date: string): Promise<number> {
    const { data, error } = await supabase().from('expenses').select('amount').eq('spent_on', date)
    fail(error)
    return (data as { amount: string | number }[]).reduce((s, r) => s + Number(r.amount), 0)
  },

  // ── Budgets ───────────────────────────────────────────────────────────────

  async getBudgets(month: string): Promise<Map<string, number>> {
    const { data, error } = await supabase().from('budgets').select('category_id, limit_amount').eq('month', month)
    fail(error)
    return new Map((data as { category_id: string; limit_amount: string | number }[]).map((r) => [r.category_id, Number(r.limit_amount)]))
  },

  async setBudget({ category_id, month, limit_amount }: BudgetInput): Promise<void> {
    const { error } = await supabase().from('budgets').delete().eq('category_id', category_id).eq('month', month)
    fail(error)
    if (limit_amount > 0) {
      const { error: e2 } = await supabase().from('budgets').insert({ id: newId(), category_id, month, limit_amount, user_id: userId })
      fail(e2)
    }
  },

  async copyBudgets(fromMonth: string, toMonth: string): Promise<number> {
    const src = await supabaseDataClient.getBudgets(fromMonth)
    const { error } = await supabase().from('budgets').delete().eq('month', toMonth)
    fail(error)
    if (src.size) {
      const { error: e2 } = await supabase().from('budgets').insert(
        [...src].map(([category_id, limit_amount]) => ({ id: newId(), category_id, month: toMonth, limit_amount, user_id: userId })),
      )
      fail(e2)
    }
    return src.size
  },

  async getPreviousBudgetMonth(month: string): Promise<string | null> {
    const { data, error } = await supabase().from('budgets').select('month').lt('month', month).order('month', { ascending: false }).limit(1)
    fail(error)
    return (data as { month: string }[])[0]?.month ?? null
  },

  async getIncome(month: string): Promise<number> {
    const { data, error } = await supabase().from('settings').select('value').eq('key', `income:${month}`).maybeSingle()
    fail(error)
    return data ? Number((data as { value: string }).value) : 0
  },

  async setIncome(month: string, amount: number): Promise<void> {
    const { error } = await supabase().from('settings').upsert({ user_id: userId, key: `income:${month}`, value: String(amount) }, { onConflict: 'user_id,key' })
    fail(error)
  },

  async getSpendHistory(month: string, historyMonths = 3): Promise<Map<string, number[]>> {
    const months = Array.from({ length: historyMonths + 1 }, (_, i) => addMonths(month, -i))
    const oldest = months[months.length - 1]
    const rows = await expensesBetween(`${oldest}-01`, monthRange(month).to)
    const out = new Map<string, number[]>()
    for (const r of rows) {
      const idx = months.indexOf(monthStr(r.spent_on))
      if (idx < 0) continue
      const arr = out.get(r.category_id) ?? new Array<number>(months.length).fill(0)
      arr[idx] += r.amount
      out.set(r.category_id, arr)
    }
    return out
  },

  // ── Goals ─────────────────────────────────────────────────────────────────

  async getGoals(): Promise<Goal[]> {
    const { data, error } = await supabase().from('goals').select('id, name, target_amount, current_amount').order('name')
    fail(error)
    return (data as { id: string; name: string; target_amount: string | number; current_amount: string | number }[]).map((g) => ({
      id: g.id, name: g.name, target_amount: Number(g.target_amount), current_amount: Number(g.current_amount),
    }))
  },

  // ── Backup ────────────────────────────────────────────────────────────────

  /** Same JSON shape as the SQLite export (0/1 booleans, no user_id) so files are interchangeable. */
  async exportData(): Promise<DataSnapshot> {
    const [habits, logs, categories, expenses, budgets, goals, settings] = await Promise.all([
      supabaseDataClient.getHabits(true),
      supabaseDataClient.getAllHabitLogs(),
      supabaseDataClient.getCategories(),
      expensesBetween('0001-01-01', '9999-12-31'),
      supabase().from('budgets').select('id, category_id, month, limit_amount').then(({ data, error }) => { fail(error); return (data ?? []).map((b) => ({ ...b, limit_amount: Number(b.limit_amount) })) }),
      supabaseDataClient.getGoals(),
      supabase().from('settings').select('key, value').then(({ data, error }) => { fail(error); return data ?? [] }),
    ])
    return { categories, habits, habit_logs: logs, expenses, budgets, goals, settings } as unknown as DataSnapshot
  },

  async importData(): Promise<void> {
    throw new Error('Restore from backup is not available on the web version yet.')
  },
}
