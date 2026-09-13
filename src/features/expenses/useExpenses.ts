import { useCallback, useEffect, useState } from 'react'
import { getDataClient } from '../../data'
import { monthStr, todayStr } from '../../lib/dates'
import type { BudgetGroup, Category, ExpenseInput, ExpenseWithCategory } from './types'

const data = getDataClient()

export function useExpenses() {
  const [month, setMonth] = useState(() => monthStr(todayStr()))
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      await data.init()
      await data.ensureDefaultCategories()
      await data.materializeRecurring()
      const [e, c] = await Promise.all([data.getExpenses(month), data.getCategories()])
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
    create: wrap((input: ExpenseInput) => data.addExpense(input)),
    update: wrap((id: string, input: ExpenseInput) => data.updateExpense(id, input)),
    remove: wrap((id: string) => data.deleteExpense(id)),
    createCategory: wrap((name: string, g: BudgetGroup) => data.addCategory({ name, budget_group: g })),
    updateCategory: wrap((id: string, name: string, g: BudgetGroup) => data.updateCategory(id, { name, budget_group: g })),
    removeCategory: wrap((id: string) => data.deleteCategory(id)),
  }
}
