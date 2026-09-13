import { useCallback, useEffect, useState } from 'react'
import { getDataClient } from '../../data'
import { addMonths, monthStr, todayStr } from '../../lib/dates'
import type { Category } from '../expenses/types'
import { overspendCheck, unassigned, type OverspendResult } from './overspend'

const data = getDataClient()

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
      await data.init()
      await data.ensureDefaultCategories()
      const [cats, limits, inc, history, prev] = await Promise.all([
        data.getCategories(),
        data.getBudgets(month),
        data.getIncome(month),
        data.getSpendHistory(month, 3),
        data.getPreviousBudgetMonth(month),
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
    setIncome: async (amount: number) => { await data.setIncome(month, amount); await reload() },
    setLimit: async (categoryId: string, limit: number) => { await data.setBudget({ category_id: categoryId, month, limit_amount: limit }); await reload() },
    copyPrevious: async () => { if (copyFrom) { await data.copyBudgets(copyFrom, month); await reload() } },
  }
}
