import { describe, expect, it } from 'vitest'
import { missingOccurrences } from './recurring'
import type { Expense } from './types'

const tpl = (spent_on: string): Expense => ({
  id: 't1', category_id: 'c', amount: 100, spent_on, note: 'Rent', is_recurring: 1, recurring_of: null,
})

describe('missingOccurrences', () => {
  it('generates one copy per month after the template month, up to the current month', () => {
    expect(missingOccurrences(tpl('2026-06-05'), [], '2026-09')).toEqual([
      { month: '2026-07', spent_on: '2026-07-05' },
      { month: '2026-08', spent_on: '2026-08-05' },
      { month: '2026-09', spent_on: '2026-09-05' },
    ])
  })
  it('skips months that already have a copy', () => {
    expect(missingOccurrences(tpl('2026-06-05'), ['2026-07', '2026-09'], '2026-09')).toEqual([
      { month: '2026-08', spent_on: '2026-08-05' },
    ])
  })
  it('returns nothing in the template month itself', () => {
    expect(missingOccurrences(tpl('2026-09-05'), [], '2026-09')).toEqual([])
  })
  it('clamps the day to the end of shorter months', () => {
    expect(missingOccurrences(tpl('2026-01-31'), [], '2026-04')).toEqual([
      { month: '2026-02', spent_on: '2026-02-28' },
      { month: '2026-03', spent_on: '2026-03-31' },
      { month: '2026-04', spent_on: '2026-04-30' },
    ])
  })
  it('crosses a year boundary', () => {
    expect(missingOccurrences(tpl('2025-11-10'), [], '2026-01').map((o) => o.month)).toEqual(['2025-12', '2026-01'])
  })
})
