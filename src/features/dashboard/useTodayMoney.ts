import { useCallback, useEffect, useState } from 'react'
import { initDb } from '../../db/db'
import { monthStr, todayStr } from '../../lib/dates'
import { getIncome, listBudgetsForMonth, spendHistory } from '../budgets/budgetsRepo'
import { overspendCheck } from '../budgets/overspend'
import { ensureDefaultCategories, listCategories } from '../expenses/categoriesRepo'
import { daySpend, materializeRecurring, monthTotals } from '../expenses/expensesRepo'
import type { Category } from '../expenses/types'

export interface TodayMoney {
  today: number
  monthSpent: number
  income: number
  allocated: number
  overBudget: string[] // category names past their limit
  overspend: string[] // category names past 1.3x trailing average
  categories: Category[]
}

/** The handful of numbers the Today screen shows for money. */
export function useTodayMoney() {
  const [data, setData] = useState<TodayMoney | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      await initDb()
      await ensureDefaultCategories()
      await materializeRecurring()
      const today = todayStr()
      const month = monthStr(today)
      const [cats, totals, limits, income, history, todaySpent] = await Promise.all([
        listCategories(), monthTotals(month), listBudgetsForMonth(month), getIncome(month), spendHistory(month, 3), daySpend(today),
      ])
      const overBudget: string[] = []
      const overspend: string[] = []
      for (const c of cats) {
        const spent = totals.byCategory.get(c.id) ?? 0
        const limit = limits.get(c.id) ?? 0
        if (limit > 0 && spent > limit) overBudget.push(c.name)
        const [, ...past] = history.get(c.id) ?? []
        if (overspendCheck(spent, past.length ? past : [0, 0, 0]).flagged) overspend.push(c.name)
      }
      setData({
        today: todaySpent,
        monthSpent: totals.total,
        income,
        allocated: [...limits.values()].reduce((s, v) => s + v, 0),
        overBudget,
        overspend,
        categories: cats,
      })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => { void reload() }, [reload])
  return { data, error, reload }
}
