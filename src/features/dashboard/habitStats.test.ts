import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog } from '../habits/types'
import { buildHeatmap, last7DaysPct, weeklyCompletion } from './habitStats'

const habit = (over: Partial<Habit>): Habit => ({
  id: 'h1', name: 'x', type: 'daily', difficulty: 'easy', base_points: 10,
  schedule: 'daily', science_tag: null, active: 1, created_at: '2026-08-01T00:00:00.000Z', ...over,
})
const log = (habit_id: string, completed_on: string): HabitLog => ({
  id: `${habit_id}-${completed_on}`, habit_id, completed_on, points_earned: 12, streak_at_time: 1,
})

// 2026-09-13 is a Sunday; the week is Mon 7 Sep – Sun 13 Sep.

describe('buildHeatmap', () => {
  it('returns full Mon–Sun columns ending on the current week', () => {
    const grid = buildHeatmap([], '2026-09-13', 2)
    expect(grid).toHaveLength(2)
    expect(grid[0][0].date).toBe('2026-08-31')
    expect(grid[1][6].date).toBe('2026-09-13')
  })
  it('counts completions per day and buckets relative to the max', () => {
    const grid = buildHeatmap([log('a', '2026-09-10'), log('b', '2026-09-10'), log('a', '2026-09-11')], '2026-09-13', 1)
    const byDate = Object.fromEntries(grid[0].map((c) => [c.date, c]))
    expect(byDate['2026-09-10']).toMatchObject({ count: 2, level: 4 })
    expect(byDate['2026-09-11']).toMatchObject({ count: 1, level: 2 })
    expect(byDate['2026-09-12']).toMatchObject({ count: 0, level: 0 })
  })
  it('zeroes days after today (mid-week)', () => {
    const grid = buildHeatmap([log('a', '2026-09-12')], '2026-09-09', 1)
    expect(grid[0].find((c) => c.date === '2026-09-12')?.count).toBe(0)
  })
})

describe('weeklyCompletion', () => {
  it('expects 7 slots for a daily habit in a full past week', () => {
    const [prev] = weeklyCompletion([habit({})], [log('h1', '2026-09-01'), log('h1', '2026-09-02')], '2026-09-13', 2)
    expect(prev.weekStart).toBe('2026-08-31')
    expect(prev.expected).toBe(7)
    expect(prev.completed).toBe(2)
    expect(prev.pct).toBe(29)
  })
  it('prorates the current week to days elapsed', () => {
    // Wednesday: Mon, Tue, Wed elapsed → 3 slots for a daily habit
    const [cur] = weeklyCompletion([habit({})], [log('h1', '2026-09-07'), log('h1', '2026-09-08'), log('h1', '2026-09-09')], '2026-09-09', 1)
    expect(cur.expected).toBe(3)
    expect(cur.pct).toBe(100)
  })
  it('uses 5 slots for weekdays and 1 for weekly', () => {
    const hs = [habit({ id: 'wd', schedule: 'weekdays' }), habit({ id: 'wk', schedule: 'weekly' })]
    const [prev] = weeklyCompletion(hs, [], '2026-09-13', 2)
    expect(prev.expected).toBe(6)
  })
  it('ignores to-dos and habits created after the week', () => {
    const hs = [habit({ id: 't', type: 'todo', schedule: null }), habit({ id: 'new', created_at: '2026-09-20T00:00:00.000Z' })]
    const [prev] = weeklyCompletion(hs, [], '2026-09-13', 2)
    expect(prev.expected).toBe(0)
    expect(prev.pct).toBeNull()
  })
  it('counts a habit only from its creation day within the week', () => {
    const hs = [habit({ created_at: '2026-09-04T10:00:00.000Z' })] // Friday
    const [prev] = weeklyCompletion(hs, [], '2026-09-13', 2)
    expect(prev.expected).toBe(3) // Fri, Sat, Sun
  })
})

describe('last7DaysPct', () => {
  it('is null with nothing scheduled', () => {
    expect(last7DaysPct([], [], '2026-09-13')).toBeNull()
  })
  it('computes done / expected over the trailing 7 days', () => {
    const logs = ['07', '08', '09', '10'].map((d) => log('h1', `2026-09-${d}`))
    expect(last7DaysPct([habit({})], logs, '2026-09-13')).toBe(57) // 4/7
  })
})
