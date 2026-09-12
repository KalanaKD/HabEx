import { useCallback, useEffect, useState } from 'react'
import { initDb } from '../../db/db'
import { monthStr, todayStr } from '../../lib/dates'
import * as cats from './categoriesRepo'
import * as repo from './expensesRepo'
import type { BudgetGroup, Category, ExpenseInput, ExpenseWithCategory } from './types'

export function useExpenses() {
  const [month, setMonth] = useState(() => monthStr(todayStr()))
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      await initDb()
      await cats.ensureDefaultCategories()
      await repo.materializeRecurring()
      const [e, c] = await Promise.all([repo.listExpensesForMonth(month), cats.listCategories()])
      setExpenses(e)
      setCategories(c)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    void reload()
  }, [reload])

  const wrap = <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) =>
    async (...args: A) => {
      await fn(...args)
      await reload()
    }

  return {
    month,
    setMonth,
    expenses,
    categories,
    loading,
    error,
    total: expenses.reduce((s, e) => s + e.amount, 0),
    create: wrap((input: ExpenseInput) => repo.createExpense(input)),
    update: wrap((id: string, input: ExpenseInput) => repo.updateExpense(id, input)),
    remove: wrap((id: string) => repo.deleteExpense(id)),
    createCategory: wrap((name: string, g: BudgetGroup) => cats.createCategory(name, g)),
    updateCategory: wrap((id: string, name: string, g: BudgetGroup) => cats.updateCategory(id, name, g)),
    removeCategory: wrap((id: string) => cats.deleteCategory(id)),
  }
}
