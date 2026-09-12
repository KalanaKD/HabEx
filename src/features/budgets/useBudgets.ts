import { useCallback, useEffect, useState } from 'react'
import { initDb } from '../../db/db'
import { addMonths, monthStr, todayStr } from '../../lib/dates'
import { ensureDefaultCategories, listCategories } from '../expenses/categoriesRepo'
import type { Category } from '../expenses/types'
import * as repo from './budgetsRepo'
import { overspendCheck, unassigned, type OverspendResult } from './overspend'

export interface BudgetRow {
  category: Category
  limit: number
  spent: number
  overspend: OverspendResult
}

export function useBudgets() {
  const [month, setMonth] = useState(() => monthStr(todayStr()))
  const [income, setIncomeState] = useState(0)
  const [rows, setRows] = useState<BudgetRow[]>([])
  const [copyFrom, setCopyFrom] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      await initDb()
      await ensureDefaultCategories()
      const [cats, limits, inc, history, prev] = await Promise.all([
        listCategories(),
        repo.listBudgetsForMonth(month),
        repo.getIncome(month),
        repo.spendHistory(month, 3),
        repo.previousBudgetMonth(month),
      ])
      setRows(
        cats.map((category) => {
          const [current = 0, ...past] = history.get(category.id) ?? []
          return {
            category,
            limit: limits.get(category.id) ?? 0,
            spent: current,
            overspend: overspendCheck(current, past.length ? past : [0, 0, 0]),
          }
        }),
      )
      setIncomeState(inc)
      // Offer "copy last budget" only when this month is empty and a prior one exists
      setCopyFrom(limits.size === 0 && prev ? prev : null)
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

  const allocated = rows.reduce((s, r) => s + r.limit, 0)

  return {
    month,
    setMonth,
    prevMonth: () => setMonth(addMonths(month, -1)),
    nextMonth: () => setMonth(addMonths(month, 1)),
    income,
    allocated,
    unassigned: unassigned(income, rows.map((r) => r.limit)),
    rows,
    copyFrom,
    loading,
    error,
    setIncome: async (amount: number) => { await repo.setIncome(month, amount); await reload() },
    setLimit: async (categoryId: string, limit: number) => { await repo.setBudget(categoryId, month, limit); await reload() },
    copyPrevious: async () => { if (copyFrom) { await repo.copyBudgets(copyFrom, month); await reload() } },
  }
}
