import { newId, query, run } from '../../db/db'
import type { BudgetGroup, Category } from './types'

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

export async function listCategories(): Promise<Category[]> {
  return query<Category>(
    `SELECT * FROM categories
     ORDER BY CASE budget_group WHEN 'needs' THEN 0 WHEN 'wants' THEN 1 ELSE 2 END, name`,
  )
}

export async function ensureDefaultCategories(): Promise<void> {
  const [{ n }] = await query<{ n: number }>('SELECT COUNT(*) AS n FROM categories')
  if (n > 0) return
  for (const c of DEFAULT_CATEGORIES) await createCategory(c.name, c.budget_group)
}

export async function createCategory(name: string, budget_group: BudgetGroup): Promise<Category> {
  const cat: Category = { id: newId(), name: name.trim(), budget_group }
  await run('INSERT INTO categories (id, name, budget_group) VALUES (?, ?, ?)', [cat.id, cat.name, cat.budget_group])
  return cat
}

export async function updateCategory(id: string, name: string, budget_group: BudgetGroup): Promise<void> {
  await run('UPDATE categories SET name = ?, budget_group = ? WHERE id = ?', [name.trim(), budget_group, id])
}

/** How many expenses reference a category — delete is refused while > 0. */
export async function categoryUsage(id: string): Promise<number> {
  const [{ n }] = await query<{ n: number }>('SELECT COUNT(*) AS n FROM expenses WHERE category_id = ?', [id])
  return n
}

export async function deleteCategory(id: string): Promise<void> {
  if ((await categoryUsage(id)) > 0) throw new Error('Category is in use by expenses; reassign them first.')
  await run('DELETE FROM budgets WHERE category_id = ?', [id])
  await run('DELETE FROM categories WHERE id = ?', [id])
}
