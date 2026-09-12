import { useCallback, useEffect, useState } from 'react'
import { initDb } from '../../db/db'
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

  const reload = useCallback(async () => {
    try {
      await initDb()
      setHabits(await repo.listHabitsWithStatus())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
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
    complete: wrap((habit: Habit) => repo.completeHabit(habit)),
    uncomplete: wrap((habit: Habit) => repo.uncompleteHabit(habit)),
  }
}
