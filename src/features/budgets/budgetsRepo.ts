import { newId, query, run } from '../../db/db'
import { addMonths } from '../../lib/dates'

/** category_id → limit_amount for one month. */
export async function listBudgetsForMonth(month: string): Promise<Map<string, number>> {
  const rows = await query<{ category_id: string; limit_amount: number }>(
    'SELECT category_id, limit_amount FROM budgets WHERE month = ?',
    [month],
  )
  return new Map(rows.map((r) => [r.category_id, r.limit_amount]))
}

/** Upsert one category's limit for a month; a limit of 0 removes the row. */
export async function setBudget(categoryId: string, month: string, limit: number): Promise<void> {
  await run('DELETE FROM budgets WHERE category_id = ? AND month = ?', [categoryId, month])
  if (limit > 0) {
    await run(
      'INSERT INTO budgets (id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)',
      [newId(), categoryId, month, limit],
    )
  }
}

/** Copy every allocation from one month to another (replacing the target's). */
export async function copyBudgets(fromMonth: string, toMonth: string): Promise<number> {
  const src = await listBudgetsForMonth(fromMonth)
  await run('DELETE FROM budgets WHERE month = ?', [toMonth])
  for (const [categoryId, limit] of src) {
    await run(
      'INSERT INTO budgets (id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)',
      [newId(), categoryId, toMonth, limit],
    )
  }
  return src.size
}

/** The most recent month before `month` that has any budgets, if any. */
export async function previousBudgetMonth(month: string): Promise<string | null> {
  const rows = await query<{ month: string }>(
    'SELECT month FROM budgets WHERE month < ? ORDER BY month DESC LIMIT 1',
    [month],
  )
  return rows[0]?.month ?? null
}

export async function getIncome(month: string): Promise<number> {
  const rows = await query<{ value: string }>('SELECT value FROM settings WHERE key = ?', [`income:${month}`])
  return rows[0] ? Number(rows[0].value) : 0
}

export async function setIncome(month: string, amount: number): Promise<void> {
  await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [`income:${month}`, String(amount)])
}

/**
 * Spend per category for `month` and the `historyMonths` before it.
 * Returns category_id → [current, prev1, prev2, ...] with 0 for empty months,
 * which is exactly the shape overspendCheck wants.
 */
export async function spendHistory(month: string, historyMonths = 3): Promise<Map<string, number[]>> {
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
}
