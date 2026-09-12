import type { Difficulty } from '../../lib/points'
import type { HabitType, Schedule } from '../../lib/scienceTips'

/** Mirrors the `habits` table. Booleans are stored as 0/1 INTEGER in SQLite. */
export interface Habit {
  id: string
  name: string
  type: HabitType
  difficulty: Difficulty
  base_points: number
  schedule: Schedule | null
  science_tag: string | null
  active: number
  created_at: string
}

/** Mirrors the `habit_logs` table. */
export interface HabitLog {
  id: string
  habit_id: string
  completed_on: string
  points_earned: number
  streak_at_time: number
}

/** What the form collects; the repo fills in id / base_points / created_at. */
export interface HabitInput {
  name: string
  type: HabitType
  difficulty: Difficulty
  schedule: Schedule | null
  science_tag: string | null
}

/** A habit plus the derived state the list needs to render one row. */
export interface HabitWithStatus extends Habit {
  completedToday: boolean
  streak: number
  totalPoints: number
}
