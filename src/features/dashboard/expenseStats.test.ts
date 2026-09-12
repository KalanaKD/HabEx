import { describe, expect, it } from 'vitest'
import type { BudgetGroup } from '../expenses/types'
import { budgetVsActual, groupRatios, pieData, type CategorySpend } from './expenseStats'

const row = (name: string, group: BudgetGroup, spent: number, limit = 0): CategorySpend => ({
  category: { id: name, name, budget_group: group }, spent, limit,
})

describe('pieData', () => {
  it('sorts by spend, drops zeros, computes shares', () => {
    const slices = pieData([row('A', 'needs', 10), row('B', 'wants', 30), row('C', 'wants', 0)])
    expect(slices.map((s) => s.name)).toEqual(['B', 'A'])
    expect(slices[0]).toMatchObject({ value: 30, pct: 0.75, colorIndex: 0 })
    expect(slices[1]).toMatchObject({ value: 10, pct: 0.25, colorIndex: 1 })
  })
  it('folds the tail into Other beyond six slices', () => {
    const rows = Array.from({ length: 8 }, (_, i) => row(`C${i}`, 'wants', 80 - i * 10))
    const slices = pieData(rows)
    expect(slices).toHaveLength(6)
    expect(slices[5]).toMatchObject({ name: 'Other (3)', value: 30 + 20 + 10, colorIndex: -1 })
  })
  it('is empty with no spend', () => {
    expect(pieData([row('A', 'needs', 0)])).toEqual([])
  })
})

describe('groupRatios', () => {
  const rows = [row('Rent', 'needs', 500), row('Fun', 'wants', 300), row('Save', 'savings', 100)]
  it('uses income as the denominator when set', () => {
    const r = groupRatios(rows, 1000)
    expect(r.basis).toBe('income')
    expect(r.ratios.map((g) => g.actual)).toEqual([0.5, 0.3, 0.1])
    expect(r.ratios[0].target).toBe(0.5)
  })
  it('falls back to total spend without income', () => {
    const r = groupRatios(rows, 0)
    expect(r.basis).toBe('spend')
    expect(r.denominator).toBe(900)
    expect(r.ratios.map((g) => Math.round(g.actual * 100))).toEqual([56, 33, 11])
  })
  it('handles an empty month', () => {
    expect(groupRatios([], 0).ratios.every((g) => g.actual === 0)).toBe(true)
  })
})

describe('budgetVsActual', () => {
  it('keeps rows with a limit or spend, biggest first', () => {
    const out = budgetVsActual([row('A', 'needs', 0, 0), row('B', 'needs', 5, 100), row('C', 'wants', 300, 0)])
    expect(out.map((r) => r.category.name)).toEqual(['C', 'B'])
  })
})
