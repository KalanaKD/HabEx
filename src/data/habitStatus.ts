import { computeStreak } from '../features/habits/streak'
import type { Habit, HabitLog, HabitWithStatus } from '../features/habits/types'
import type { DateStr } from '../lib/dates'

/**
 * Habits joined with today's completion state, current streak and lifetime
 * points. Pure: both data clients feed it their rows.
 */
export function withStatus(habits: Habit[], logs: HabitLog[], today: DateStr): HabitWithStatus[] {
  const byHabit = new Map<string, HabitLog[]>()
  for (const l of logs) {
    const arr = byHabit.get(l.habit_id) ?? []
    arr.push(l)
    byHabit.set(l.habit_id, arr)
  }
  return habits.map((h) => {
    const hl = byHabit.get(h.id) ?? []
    return {
      ...h,
      completedToday: hl.some((l) => l.completed_on === today),
      streak: computeStreak(hl.map((l) => l.completed_on), h.schedule, today),
      totalPoints: hl.reduce((sum, l) => sum + l.points_earned, 0),
    }
  })
}
