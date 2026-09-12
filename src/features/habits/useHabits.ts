import { useCallback, useEffect, useState } from 'react'
import { announceLevelUp, toast } from '../../components/toast'
import { initDb } from '../../db/db'
import { burstAt, shower } from '../../lib/celebrate'
import { isWeekday, todayStr } from '../../lib/dates'
import { levelFromPoints } from '../../lib/points'
import * as repo from './habitsRepo'
import type { Habit, HabitInput, HabitWithStatus } from './types'

/**
 * React-side API for the habit feature. Components never call the repo
 * directly; they call these actions, and the list refreshes afterwards.
 */
export function useHabits() {
  const [habits, setHabits] = useState<HabitWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async (): Promise<HabitWithStatus[]> => {
    try {
      await initDb()
      const list = await repo.listHabitsWithStatus()
      setHabits(list)
      setError(null)
      return list
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Each action is "do the write, then reload". Wrapping them this way keeps
  // the components tiny and guarantees the list never drifts from the DB.
  const wrap = <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) =>
    async (...args: A) => {
      await fn(...args)
      await reload()
    }

  return {
    habits,
    loading,
    error,
    reload,
    create: wrap((input: HabitInput) => repo.createHabit(input)),
    update: wrap((id: string, input: HabitInput) => repo.updateHabit(id, input)),
    archive: wrap((id: string) => repo.archiveHabit(id)),
    remove: wrap((id: string) => repo.deleteHabit(id)),
    /**
     * Complete + celebrate. `origin` is the screen point of the tapped
     * button so the confetti bursts from it.
     */
    complete: async (habit: Habit, origin?: { x: number; y: number }) => {
      const before = habits.reduce((s, h) => s + h.totalPoints, 0)
      const wasDone = habits.find((h) => h.id === habit.id)?.completedToday
      const log = await repo.completeHabit(habit)
      const list = await reload()
      if (wasDone) return // no-op tap; nothing to celebrate

      if (origin) burstAt(origin.x, origin.y)
      const streak = log.streak_at_time > 1 ? ` · 🔥 ${log.streak_at_time} day streak` : ''
      toast(`+${log.points_earned} XP${streak}`, 'xp')

      const after = before + log.points_earned
      if (levelFromPoints(after) > levelFromPoints(before)) {
        announceLevelUp(levelFromPoints(after))
        return
      }
      const today = todayStr()
      const due = list.filter((h) => h.schedule !== 'weekdays' || isWeekday(today))
      if (due.length > 1 && due.every((h) => h.completedToday)) {
        shower()
        toast('All done for today! 🎉')
      }
    },
    uncomplete: wrap((habit: Habit) => repo.uncompleteHabit(habit)),
  }
}
