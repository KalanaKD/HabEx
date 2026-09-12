export type BudgetGroup = 'needs' | 'wants' | 'savings'

/** Mirrors the `categories` table. */
export interface Category {
  id: string
  name: string
  budget_group: BudgetGroup
}

/** Mirrors the `expenses` table (+ the migrated recurring_of column). */
export interface Expense {
  id: string
  category_id: string
  amount: number
  spent_on: string // 'YYYY-MM-DD'
  note: string | null
  is_recurring: number // 0 | 1
  recurring_of: string | null // template expense id, for auto-generated copies
}

export interface ExpenseInput {
  category_id: string
  amount: number
  spent_on: string
  note: string | null
  is_recurring: boolean
}

export interface ExpenseWithCategory extends Expense {
  category_name: string
  budget_group: BudgetGroup
}
