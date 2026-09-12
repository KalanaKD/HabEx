/** Pure aggregation for the budgets dashboard — about the plan, not actuals. */
import type { BudgetGroup } from '../expenses/types'
import { slicesFrom, TARGET_RATIO, type CategorySpend, type PieSlice } from './expenseStats'

/** colorIndex used for the Unassigned slice (rendered in a neutral tone). */
export const UNASSIGNED_INDEX = -2

/**
 * Allocation donut: one slice per category with a limit, plus an
 * "Unassigned" slice when income exceeds the allocations. Shares are of
 * income when set, so the chart reads as "where does the income go".
 */
export function allocationSlices(rows: CategorySpend[], income: number): PieSlice[] {
  const allocated = rows.reduce((s, r) => s + r.limit, 0)
  const total = income > allocated ? income : allocated
  const slices = slicesFrom(rows.map((r) => ({ name: r.category.name, value: r.limit })), total)
  if (income > allocated && slices.length > 0) {
    const rest = income - allocated
    slices.push({ name: 'Unassigned', value: rest, pct: rest / total, colorIndex: UNASSIGNED_INDEX })
  }
  return slices
}

export interface GroupPlan {
  group: BudgetGroup
  allocated: number
  spent: number
  /** Allocated share of income (or of total allocations when no income). */
  share: number
  target: number
}

export function groupPlan(rows: CategorySpend[], income: number): { plans: GroupPlan[]; basis: 'income' | 'allocated'; denominator: number } {
  const acc: Record<BudgetGroup, { allocated: number; spent: number }> = {
    needs: { allocated: 0, spent: 0 }, wants: { allocated: 0, spent: 0 }, savings: { allocated: 0, spent: 0 },
  }
  for (const r of rows) {
    acc[r.category.budget_group].allocated += r.limit
    acc[r.category.budget_group].spent += r.spent
  }
  const totalAllocated = acc.needs.allocated + acc.wants.allocated + acc.savings.allocated
  const basis = income > 0 ? 'income' : 'allocated'
  const denominator = basis === 'income' ? income : totalAllocated
  const plans = (['needs', 'wants', 'savings'] as BudgetGroup[]).map((group) => ({
    group,
    ...acc[group],
    share: denominator > 0 ? acc[group].allocated / denominator : 0,
    target: TARGET_RATIO[group],
  }))
  return { plans, basis, denominator }
}
