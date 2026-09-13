import { useEffect, useState } from 'react'
import { getDataClient } from '../../data'
import type { CategorySpend } from './expenseStats'

export function useExpenseStats(month: string) {
  const [rows, setRows] = useState<CategorySpend[] | null>(null)
  const [income, setIncome] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = getDataClient()
        await data.init()
        const [cats, totals, limits, inc] = await Promise.all([
          data.getCategories(), data.getMonthTotals(month), data.getBudgets(month), data.getIncome(month),
        ])
        if (cancelled) return
        setRows(cats.map((category) => ({
          category,
          spent: totals.byCategory.get(category.id) ?? 0,
          limit: limits.get(category.id) ?? 0,
        })))
        setIncome(inc)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => { cancelled = true }
  }, [month])

  return { rows, income, error }
}
