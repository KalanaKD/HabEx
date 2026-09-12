import { newId, query, run } from '../../db/db'
import { monthStr, todayStr } from '../../lib/dates'
import { missingOccurrences } from './recurring'
import type { Expense, ExpenseInput, ExpenseWithCategory } from './types'

const SELECT_WITH_CATEGORY = `
  SELECT e.*, c.name AS category_name, c.budget_group
  FROM expenses e JOIN categories c ON c.id = e.category_id`

export async function listExpensesForMonth(month: string): Promise<ExpenseWithCategory[]> {
  return query<ExpenseWithCategory>(
    `${SELECT_WITH_CATEGORY} WHERE substr(e.spent_on, 1, 7) = ? ORDER BY e.spent_on DESC, e.rowid DESC`,
    [month],
  )
}

export async function getExpense(id: string): Promise<Expense | undefined> {
  return (await query<Expense>('SELECT * FROM expenses WHERE id = ?', [id]))[0]
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
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
}

/**
 * Editing a template changes future copies (they're generated from it);
 * editing a copy changes only that month. Turning recurring off on a copy
 * detaches it from its template.
 */
export async function updateExpense(id: string, input: ExpenseInput): Promise<void> {
  await run(
    `UPDATE expenses SET category_id = ?, amount = ?, spent_on = ?, note = ?, is_recurring = ?,
       recurring_of = CASE WHEN ? = 0 THEN NULL ELSE recurring_of END
     WHERE id = ?`,
    [input.category_id, input.amount, input.spent_on, input.note?.trim() || null,
     input.is_recurring ? 1 : 0, input.is_recurring ? 1 : 0, id],
  )
}

/** Deleting a template leaves its already-generated copies as ordinary expenses. */
export async function deleteExpense(id: string): Promise<void> {
  await run('UPDATE expenses SET recurring_of = NULL, is_recurring = 0 WHERE recurring_of = ?', [id])
  await run('DELETE FROM expenses WHERE id = ?', [id])
}

/**
 * Create this month's (and any skipped months') copies of every recurring
 * template. Called on load so the month view is always complete.
 * Returns the number of rows inserted.
 */
export async function materializeRecurring(today = todayStr()): Promise<number> {
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
}

/** Month total and per-category totals — the numbers the header and (later) budgets need. */
export async function monthTotals(month: string): Promise<{ total: number; byCategory: Map<string, number> }> {
  const rows = await query<{ category_id: string; total: number }>(
    `SELECT category_id, SUM(amount) AS total FROM expenses
     WHERE substr(spent_on, 1, 7) = ? GROUP BY category_id`,
    [month],
  )
  const byCategory = new Map(rows.map((r) => [r.category_id, r.total]))
  return { total: rows.reduce((s, r) => s + r.total, 0), byCategory }
}

/** Total spent on one day. */
export async function daySpend(date: string): Promise<number> {
  const rows = await query<{ total: number | null }>('SELECT SUM(amount) AS total FROM expenses WHERE spent_on = ?', [date])
  return rows[0]?.total ?? 0
}
