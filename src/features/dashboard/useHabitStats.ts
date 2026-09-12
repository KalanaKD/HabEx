import { useEffect, useState } from 'react'
import { initDb } from '../../db/db'
import { todayStr } from '../../lib/dates'
import { levelFromPoints, pointsForLevel } from '../../lib/points'
import { listAllLogs, listHabitsWithStatus, totalPointsEarned } from '../habits/habitsRepo'
import { buildHeatmap, last7DaysPct, weeklyCompletion, type HeatmapCell, type WeekCompletion } from './habitStats'

export interface HabitStats {
  totalPoints: number
  level: number
  /** 0–1 progress from the current level to the next. */
  levelProgress: number
  pointsToNext: number
  bestStreak: number
  last7Pct: number | null
  heatmap: HeatmapCell[][]
  weekly: WeekCompletion[]
}

/** Loads everything the habit dashboard shows, once, on mount. */
export function useHabitStats() {
  const [stats, setStats] = useState<HabitStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await initDb()
        const today = todayStr()
        const [habits, logs, totalPoints] = await Promise.all([
          listHabitsWithStatus(today),
          listAllLogs(),
          totalPointsEarned(),
        ])
        const level = levelFromPoints(totalPoints)
        const floor = pointsForLevel(level)
        const ceil = pointsForLevel(level + 1)
        if (cancelled) return
        setStats({
          totalPoints,
          level,
          levelProgress: (totalPoints - floor) / (ceil - floor),
          pointsToNext: ceil - totalPoints,
          bestStreak: habits.reduce((m, h) => Math.max(m, h.streak), 0),
          last7Pct: last7DaysPct(habits, logs, today),
          heatmap: buildHeatmap(logs, today),
          weekly: weeklyCompletion(habits, logs, today),
        })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { stats, error }
}
