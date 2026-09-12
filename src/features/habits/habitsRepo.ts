/**
 * Data access for habits and habit_logs. Every SQL statement touching these
 * tables lives here so the hook and UI stay free of table/column names.
 */
import { newId, query, run } from '../../db/db'
import { todayStr, type DateStr } from '../../lib/dates'
import { BASE_POINTS, pointsEarned } from '../../lib/points'
import { computeStreak } from './streak'
import type { Habit, HabitInput, HabitLog, HabitWithStatus } from './types'

export async function listHabits(includeArchived = false): Promise<Habit[]> {
  return query<Habit>(
    `SELECT * FROM habits ${includeArchived ? '' : 'WHERE active = 1'} ORDER BY created_at ASC`,
  )
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  const habit: Habit = {
    id: newId(),
    name: input.name.trim(),
    type: input.type,
    difficulty: input.difficulty,
    base_points: BASE_POINTS[input.difficulty],
    schedule: input.type === 'todo' ? null : input.schedule,
    science_tag: input.science_tag?.trim() || null,
    active: 1,
    created_at: new Date().toISOString(),
  }
  await run(
    `INSERT INTO habits (id, name, type, difficulty, base_points, schedule, science_tag, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [habit.id, habit.name, habit.type, habit.difficulty, habit.base_points, habit.schedule,
     habit.science_tag, habit.active, habit.created_at],
  )
  return habit
}

export async function updateHabit(id: string, input: HabitInput): Promise<void> {
  await run(
    `UPDATE habits SET name = ?, type = ?, difficulty = ?, base_points = ?, schedule = ?, science_tag = ?
     WHERE id = ?`,
    [input.name.trim(), input.type, input.difficulty, BASE_POINTS[input.difficulty],
     input.type === 'todo' ? null : input.schedule, input.science_tag?.trim() || null, id],
  )
}

/** Soft delete: keeps the logs (and the points they earned). */
export async function archiveHabit(id: string): Promise<void> {
  await run('UPDATE habits SET active = 0 WHERE id = ?', [id])
}

/** Hard delete: removes the habit and its logs. Points earned are lost. */
export async function deleteHabit(id: string): Promise<void> {
  await run('DELETE FROM habit_logs WHERE habit_id = ?', [id])
  await run('DELETE FROM habits WHERE id = ?', [id])
}

export async function listLogsForHabit(habitId: string): Promise<HabitLog[]> {
  return query<HabitLog>(
    'SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY completed_on ASC',
    [habitId],
  )
}

export async function listAllLogs(): Promise<HabitLog[]> {
  return query<HabitLog>('SELECT * FROM habit_logs ORDER BY completed_on ASC')
}

/**
 * Mark a habit done for `date` (default today). One completion per day: if a
 * log already exists it's returned unchanged. Computes the streak *including*
 * this completion and the points from the brief's formula, then writes the log.
 * A 'todo' is archived on completion — it's a one-off.
 */
export async function completeHabit(habit: Habit, date: DateStr = todayStr()): Promise<HabitLog> {
  const existing = await query<HabitLog>(
    'SELECT * FROM habit_logs WHERE habit_id = ? AND completed_on = ?',
    [habit.id, date],
  )
  if (existing[0]) return existing[0]

  const prior = await listLogsForHabit(habit.id)
  const dates = prior.map((l) => l.completed_on)
  dates.push(date)
  const streak = computeStreak(dates, habit.schedule, date)

  const log: HabitLog = {
    id: newId(),
    habit_id: habit.id,
    completed_on: date,
    points_earned: pointsEarned(habit.difficulty, streak),
    streak_at_time: streak,
  }
  await run(
    'INSERT INTO habit_logs (id, habit_id, completed_on, points_earned, streak_at_time) VALUES (?, ?, ?, ?, ?)',
    [log.id, log.habit_id, log.completed_on, log.points_earned, log.streak_at_time],
  )
  if (habit.type === 'todo') await archiveHabit(habit.id)
  return log
}

/** Undo a completion (mis-tap). Re-activates a todo that was auto-archived. */
export async function uncompleteHabit(habit: Habit, date: DateStr = todayStr()): Promise<void> {
  await run('DELETE FROM habit_logs WHERE habit_id = ? AND completed_on = ?', [habit.id, date])
  if (habit.type === 'todo') await run('UPDATE habits SET active = 1 WHERE id = ?', [habit.id])
}

/** Habits joined with today's completion state, current streak and lifetime points. */
export async function listHabitsWithStatus(today: DateStr = todayStr()): Promise<HabitWithStatus[]> {
  const [habits, logs] = await Promise.all([listHabits(), listAllLogs()])
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

/** Sum of every point ever earned — the input to levelFromPoints(). */
export async function totalPointsEarned(): Promise<number> {
  const rows = await query<{ total: number | null }>('SELECT SUM(points_earned) AS total FROM habit_logs')
  return rows[0]?.total ?? 0
}
