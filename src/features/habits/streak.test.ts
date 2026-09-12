import { describe, expect, it } from 'vitest'
import { computeStreak } from './streak'

// 2026-09-13 is a Sunday; 2026-09-11 a Friday; 2026-09-14 a Monday.

describe('computeStreak – daily', () => {
  it('is 0 with no completions', () => {
    expect(computeStreak([], 'daily', '2026-09-13')).toBe(0)
  })
  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-09-11', '2026-09-12', '2026-09-13'], 'daily', '2026-09-13')).toBe(3)
  })
  it('survives an unfinished today (counts from yesterday)', () => {
    expect(computeStreak(['2026-09-11', '2026-09-12'], 'daily', '2026-09-13')).toBe(2)
  })
  it('breaks on a missed day', () => {
    expect(computeStreak(['2026-09-10', '2026-09-12', '2026-09-13'], 'daily', '2026-09-13')).toBe(2)
    expect(computeStreak(['2026-09-10'], 'daily', '2026-09-13')).toBe(0)
  })
  it('ignores duplicates and order', () => {
    expect(computeStreak(['2026-09-13', '2026-09-12', '2026-09-12'], 'daily', '2026-09-13')).toBe(2)
  })
  it('treats null schedule as daily', () => {
    expect(computeStreak(['2026-09-12', '2026-09-13'], null, '2026-09-13')).toBe(2)
  })
})

describe('computeStreak – weekdays', () => {
  it('skips the weekend without breaking', () => {
    // Thu, Fri done; today is Monday, not done yet.
    expect(computeStreak(['2026-09-10', '2026-09-11'], 'weekdays', '2026-09-14')).toBe(2)
    // ...and Monday done.
    expect(computeStreak(['2026-09-10', '2026-09-11', '2026-09-14'], 'weekdays', '2026-09-14')).toBe(3)
  })
  it('on a weekend, looks back to Friday', () => {
    expect(computeStreak(['2026-09-10', '2026-09-11'], 'weekdays', '2026-09-13')).toBe(2)
  })
  it('does not count a weekend completion as a scheduled day', () => {
    // Sat completion alone, checked Monday: Friday wasn't done, so 0.
    expect(computeStreak(['2026-09-12'], 'weekdays', '2026-09-14')).toBe(0)
  })
})

describe('computeStreak – weekly', () => {
  it('counts consecutive weeks, any day in the week', () => {
    // Weeks of Aug 31, Sep 7 done; current week (Sep 14) not yet.
    expect(computeStreak(['2026-09-02', '2026-09-11'], 'weekly', '2026-09-15')).toBe(2)
    expect(computeStreak(['2026-09-02', '2026-09-11', '2026-09-14'], 'weekly', '2026-09-15')).toBe(3)
  })
  it('breaks on a missed week', () => {
    expect(computeStreak(['2026-08-26', '2026-09-11'], 'weekly', '2026-09-13')).toBe(1)
  })
})
