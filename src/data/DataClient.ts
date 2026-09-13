/**
 * The data-access contract. Implemented twice — SQLite (Android, on-device)
 * and Supabase (web) — and consumed ONLY by hooks and lib/backup. Components
 * never see it; they talk to hooks.
 *
 * Row shapes are the existing snake_case types from features/*\/types.ts:
 * they match the column names in both stores exactly.
 *
 * Comments give the pre-refactor repo function each method was extracted from.
 */
import type { DateStr } from '../lib/dates'
import type { Category, Expense, ExpenseInput, ExpenseWithCategory } from '../features/expenses/types'
import type { Habit, HabitInput, HabitLog, HabitWithStatus } from '../features/habits/types'

export interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
}

export interface BudgetInput {
  category_id: string
  month: string // 'YYYY-MM'
  limit_amount: number
}

/** Table name → rows, as produced by exportData() and consumed by importData(). */
export type DataSnapshot = Record<string, Record<string, unknown>[]>

export interface DataClient {
  /** Open the store and make sure the schema exists. Safe to call repeatedly. */
  init(): Promise<void>

  // ── Habits ────────────────────────────────────────────────────────────────
  /** habitsRepo.listHabits */
  getHabits(includeArchived?: boolean): Promise<Habit[]>
  /** habitsRepo.listHabitsWithStatus — habits + today's completion, streak, lifetime points */
  getHabitsWithStatus(today?: DateStr): Promise<HabitWithStatus[]>
  /** habitsRepo.createHabit */
  addHabit(input: HabitInput): Promise<Habit>
  /** habitsRepo.updateHabit */
  updateHabit(id: string, input: HabitInput): Promise<void>
  /** habitsRepo.archiveHabit — soft delete, keeps logs and points */
  archiveHabit(id: string): Promise<void>
  /** habitsRepo.deleteHabit — hard delete, removes logs too */
  deleteHabit(id: string): Promise<void>
  /** habitsRepo.completeHabit — one log per day; computes streak + points; archives todos */
  logHabitComplete(habitId: string, date?: DateStr): Promise<HabitLog>
  /** habitsRepo.uncompleteHabit — undo a mis-tap */
  undoHabitComplete(habitId: string, date?: DateStr): Promise<void>
  /** habitsRepo.listLogsForHabit (+ optional inclusive date range) */
  getHabitLogs(habitId: string, range?: { from: DateStr; to: DateStr }): Promise<HabitLog[]>
  /** habitsRepo.listAllLogs */
  getAllHabitLogs(): Promise<HabitLog[]>
  /** habitsRepo.totalPointsEarned */
  getTotalPoints(): Promise<number>

  // ── Categories ────────────────────────────────────────────────────────────
  /** categoriesRepo.listCategories */
  getCategories(): Promise<Category[]>
  /** categoriesRepo.ensureDefaultCategories — seeds the default set if the table is empty */
  ensureDefaultCategories(): Promise<void>
  /** categoriesRepo.createCategory */
  addCategory(input: Omit<Category, 'id'>): Promise<Category>
  /** categoriesRepo.updateCategory */
  updateCategory(id: string, input: Omit<Category, 'id'>): Promise<void>
  /** categoriesRepo.categoryUsage — number of expenses referencing it */
  getCategoryUsage(id: string): Promise<number>
  /** categoriesRepo.deleteCategory — throws while in use */
  deleteCategory(id: string): Promise<void>

  // ── Expenses ──────────────────────────────────────────────────────────────
  /** expensesRepo.listExpensesForMonth — joined with category name/group */
  getExpenses(month: string): Promise<ExpenseWithCategory[]>
  /** expensesRepo.getExpense */
  getExpense(id: string): Promise<Expense | undefined>
  /** expensesRepo.createExpense */
  addExpense(input: ExpenseInput): Promise<Expense>
  /** expensesRepo.updateExpense */
  updateExpense(id: string, input: ExpenseInput): Promise<void>
  /** expensesRepo.deleteExpense — detaches recurring copies */
  deleteExpense(id: string): Promise<void>
  /** expensesRepo.materializeRecurring — returns rows inserted */
  materializeRecurring(today?: DateStr): Promise<number>
  /** expensesRepo.monthTotals */
  getMonthTotals(month: string): Promise<{ total: number; byCategory: Map<string, number> }>
  /** expensesRepo.daySpend */
  getDaySpend(date: DateStr): Promise<number>

  // ── Budgets ───────────────────────────────────────────────────────────────
  /** budgetsRepo.listBudgetsForMonth — category_id → limit_amount */
  getBudgets(month: string): Promise<Map<string, number>>
  /** budgetsRepo.setBudget — upsert; limit_amount 0 removes the row */
  setBudget(input: BudgetInput): Promise<void>
  /** budgetsRepo.copyBudgets — returns rows copied */
  copyBudgets(fromMonth: string, toMonth: string): Promise<number>
  /** budgetsRepo.previousBudgetMonth */
  getPreviousBudgetMonth(month: string): Promise<string | null>
  /** budgetsRepo.getIncome */
  getIncome(month: string): Promise<number>
  /** budgetsRepo.setIncome */
  setIncome(month: string, amount: number): Promise<void>
  /** budgetsRepo.spendHistory — category_id → [current, prev1, prev2, …] */
  getSpendHistory(month: string, historyMonths?: number): Promise<Map<string, number[]>>

  // ── Goals ─────────────────────────────────────────────────────────────────
  getGoals(): Promise<Goal[]>

  // ── Backup ────────────────────────────────────────────────────────────────
  /** lib/backup.buildBackup (table part) — every table's rows */
  exportData(): Promise<DataSnapshot>
  /** lib/backup.restoreBackup (table part) — replace everything, atomically */
  importData(snapshot: DataSnapshot): Promise<void>
}
