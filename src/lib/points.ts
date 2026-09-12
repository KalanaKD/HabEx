/** Points / level formulas from project-brief.md. Pure functions, no I/O. */

export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard'

export const BASE_POINTS: Record<Difficulty, number> = {
  trivial: 5,
  easy: 10,
  medium: 20,
  hard: 35,
}

export const MAX_STREAK_BONUS = 30

/** streak_bonus = min(streak_days * 2, 30) */
export function streakBonus(streakDays: number): number {
  return Math.min(Math.max(streakDays, 0) * 2, MAX_STREAK_BONUS)
}

/** points_earned = base_points[difficulty] + streak_bonus */
export function pointsEarned(difficulty: Difficulty, streakDays: number): number {
  return BASE_POINTS[difficulty] + streakBonus(streakDays)
}

/** level = floor(sqrt(total_points / 100)) */
export function levelFromPoints(totalPoints: number): number {
  return Math.floor(Math.sqrt(Math.max(totalPoints, 0) / 100))
}

/** Total points needed to reach a given level (inverse of levelFromPoints). */
export function pointsForLevel(level: number): number {
  return level * level * 100
}
