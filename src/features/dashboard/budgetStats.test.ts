import { describe, expect, it } from 'vitest'
import type { BudgetGroup } from '../expenses/types'
import { allocationSlices, groupPlan, UNASSIGNED_INDEX } from './budgetStats'
import type { CategorySpend } from './expenseStats'

const row = (name: string, group: BudgetGroup, limit: number, spent = 0): CategorySpend => ({
  category: { id: name, name, budget_group: group }, spent, limit,
})

describe('allocationSlices', () => {
  it('adds an Unassigned slice for income not yet allocated', () => {
    const s = allocationSlices([row('Rent', 'needs', 500), row('Fun', 'wants', 200)], 1000)
    expect(s.map((x) => x.name)).toEqual(['Rent', 'Fun', 'Unassigned'])
    expect(s[2]).toMatchObject({ value: 300, pct: 0.3, colorIndex: UNASSIGNED_INDEX })
    expect(s[0].pct).toBe(0.5)
  })
  it('has no Unassigned slice when fully or over-allocated', () => {
    expect(allocationSlices([row('Rent', 'needs', 1000)], 1000).map((x) => x.name)).toEqual(['Rent'])
    const over = allocationSlices([row('Rent', 'needs', 1200)], 1000)
    expect(over.map((x) => x.name)).toEqual(['Rent'])
    expect(over[0].pct).toBe(1)
  })
  it('is empty with no allocations', () => {
    expect(allocationSlices([row('Rent', 'needs', 0)], 1000)).toEqual([])
  })
})

describe('groupPlan', () => {
  const rows = [row('Rent', 'needs', 500, 480), row('Fun', 'wants', 300, 100), row('Save', 'savings', 100, 100)]
  it('sums allocated and spent per group with shares of income', () => {
    const { plans, basis } = groupPlan(rows, 1000)
    expect(basis).toBe('income')
    expect(plans[0]).toMatchObject({ group: 'needs', allocated: 500, spent: 480, share: 0.5, target: 0.5 })
    expect(plans[2]).toMatchObject({ group: 'savings', allocated: 100, share: 0.1, target: 0.2 })
  })
  it('falls back to total allocations as the basis', () => {
    const { plans, basis, denominator } = groupPlan(rows, 0)
    expect(basis).toBe('allocated')
    expect(denominator).toBe(900)
    expect(Math.round(plans[1].share * 100)).toBe(33)
  })
})
