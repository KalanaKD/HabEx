/** Pure aggregation for the expense dashboard. */
import type { BudgetGroup, Category } from '../expenses/types'

export interface CategorySpend {
  category: Category
  spent: number
  limit: number
}

export interface PieSlice {
  name: string
  value: number
  pct: number
  /** Index into the fixed categorical palette. */
  colorIndex: number
}

/** Fixed hue order — assigned by rank once, never re-cycled. Validated CVD-safe. */
export const CATEGORY_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']
export const OTHER_COLOR = '#94a3b8'
export const MAX_SLICES = CATEGORY_COLORS.length

/**
 * Largest items first; anything beyond MAX_SLICES folds into "Other" so the
 * pie never needs a 9th hue. Zero-value items are dropped. `pct` is the share
 * of `total` (defaults to the sum of the items).
 */
export function slicesFrom(items: { name: string; value: number }[], total?: number): PieSlice[] {
  const kept = items.filter((r) => r.value > 0).sort((a, b) => b.value - a.value)
  const denom = total ?? kept.reduce((s, r) => s + r.value, 0)
  if (denom === 0) return []
  const head = kept.length > MAX_SLICES ? kept.slice(0, MAX_SLICES - 1) : kept
  const tail = kept.slice(head.length)
  const slices = head.map((r, i) => ({ name: r.name, value: r.value, pct: r.value / denom, colorIndex: i }))
  if (tail.length) {
    const other = tail.reduce((s, r) => s + r.value, 0)
    slices.push({ name: `Other (${tail.length})`, value: other, pct: other / denom, colorIndex: -1 })
  }
  return slices
}

/** Spending pie: one slice per category with spend this month. */
export function pieData(rows: CategorySpend[]): PieSlice[] {
  return slicesFrom(rows.map((r) => ({ name: r.category.name, value: r.spent })))
}

export const TARGET_RATIO: Record<BudgetGroup, number> = { needs: 0.5, wants: 0.3, savings: 0.2 }

export interface GroupRatio {
  group: BudgetGroup
  spent: number
  /** Share of the denominator, 0–1. */
  actual: number
  target: number
}

/**
 * Needs / wants / savings share versus the 50/30/20 rule. The rule is defined
 * on income, so that's the denominator when known; otherwise the month's total
 * spend (in which case the three shares sum to 100%).
 */
export function groupRatios(rows: CategorySpend[], income: number): { ratios: GroupRatio[]; basis: 'income' | 'spend'; denominator: number } {
  const spentByGroup: Record<BudgetGroup, number> = { needs: 0, wants: 0, savings: 0 }
  for (const r of rows) spentByGroup[r.category.budget_group] += r.spent
  const totalSpend = spentByGroup.needs + spentByGroup.wants + spentByGroup.savings
  const basis = income > 0 ? 'income' : 'spend'
  const denominator = basis === 'income' ? income : totalSpend
  const ratios = (['needs', 'wants', 'savings'] as BudgetGroup[]).map((group) => ({
    group,
    spent: spentByGroup[group],
    actual: denominator > 0 ? spentByGroup[group] / denominator : 0,
    target: TARGET_RATIO[group],
  }))
  return { ratios, basis, denominator }
}

/** Rows worth charting for budget-vs-actual: anything with a limit or spend. */
export function budgetVsActual(rows: CategorySpend[]): CategorySpend[] {
  return rows.filter((r) => r.limit > 0 || r.spent > 0).sort((a, b) => Math.max(b.limit, b.spent) - Math.max(a.limit, a.spent))
}
