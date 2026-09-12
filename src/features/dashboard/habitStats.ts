/**
 * Pure aggregation functions for the habit dashboard. They take the raw
 * habits + logs and return exactly the shapes the widgets render.
 */
import { addDays, isWeekday, parseDateStr, weekStart, type DateStr } from '../../lib/dates'
import type { Habit, HabitLog } from '../habits/types'

export interface HeatmapCell {
  date: DateStr
  count: number
  /** 0–4 intensity bucket, relative to the busiest day in the window. */
  level: 0 | 1 | 2 | 3 | 4
}

/**
 * Completions per day for the last `weeks` weeks, ending on `today`.
 * Returns full weeks (Mon–Sun) so the grid renders as neat columns; days after
 * `today` are included with count 0 so the last column is complete.
 */
export function buildHeatmap(logs: HabitLog[], today: DateStr, weeks = 12): HeatmapCell[][] {
  const counts = new Map<DateStr, number>()
  for (const l of logs) counts.set(l.completed_on, (counts.get(l.completed_on) ?? 0) + 1)

  const end = addDays(weekStart(today), 6) // Sunday of the current week
  const start = addDays(end, -(weeks * 7 - 1))
  let max = 0
  for (let d = start; d <= end; d = addDays(d, 1)) max = Math.max(max, counts.get(d) ?? 0)

  const columns: HeatmapCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: HeatmapCell[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, w * 7 + i)
      const count = date > today ? 0 : (counts.get(date) ?? 0)
      col.push({ date, count, level: bucket(count, max) })
    }
    columns.push(col)
  }
  return columns
}

function bucket(count: number, max: number): HeatmapCell['level'] {
  if (count === 0 || max === 0) return 0
  const r = count / max
  if (r <= 0.25) return 1
  if (r <= 0.5) return 2
  if (r <= 0.75) return 3
  return 4
}

export interface WeekCompletion {
  weekStart: DateStr
  /** Short label like "8 Sep". */
  label: string
  completed: number
  expected: number
  /** 0–100, or null when nothing was expected that week. */
  pct: number | null
}

/**
 * Weekly completion % for the last `weeks` weeks.
 *
 * expected = sum over habits of the scheduled slots in that week:
 *   daily → 7, weekdays → 5, weekly → 1 (a 'habit' type uses its schedule
 *   too; to-dos are excluded — they have no schedule). A habit only counts
 *   from the week it was created. For the current, unfinished week the slots
 *   are prorated to the days elapsed so far, so today's % isn't dragged down
 *   by days that haven't happened yet.
 */
export function weeklyCompletion(
  habits: Habit[],
  logs: HabitLog[],
  today: DateStr,
  weeks = 8,
): WeekCompletion[] {
  const scheduled = habits.filter((h) => h.type !== 'todo')
  const thisWeek = weekStart(today)
  const out: WeekCompletion[] = []

  for (let w = weeks - 1; w >= 0; w--) {
    const ws = addDays(thisWeek, -7 * w)
    const we = addDays(ws, 6)
    const lastDay = we > today ? today : we // prorate the current week

    let expected = 0
    for (const h of scheduled) {
      const created = h.created_at.slice(0, 10)
      if (created > we) continue // didn't exist yet
      const from = created > ws ? created : ws
      if (from > lastDay) continue
      expected += slotsBetween(h.schedule ?? 'daily', from, lastDay)
    }

    const ids = new Set(scheduled.map((h) => h.id))
    const completed = logs.filter(
      (l) => ids.has(l.habit_id) && l.completed_on >= ws && l.completed_on <= we,
    ).length

    out.push({
      weekStart: ws,
      label: shortLabel(ws),
      completed,
      expected,
      pct: expected === 0 ? null : Math.min(100, Math.round((completed / expected) * 100)),
    })
  }
  return out
}

function slotsBetween(schedule: Habit['schedule'] & string, from: DateStr, to: DateStr): number {
  if (schedule === 'weekly') return 1
  let n = 0
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (schedule === 'daily' || isWeekday(d)) n++
  }
  return n
}

function shortLabel(d: DateStr): string {
  const date = parseDateStr(d)
  return `${date.getDate()} ${date.toLocaleString('en', { month: 'short' })}`
}

/** Completion % across the last 7 days (today inclusive), for the summary card. */
export function last7DaysPct(habits: Habit[], logs: HabitLog[], today: DateStr): number | null {
  const scheduled = habits.filter((h) => h.type !== 'todo')
  const from = addDays(today, -6)
  let expected = 0
  for (const h of scheduled) {
    const created = h.created_at.slice(0, 10)
    const start = created > from ? created : from
    if (start > today) continue
    expected += slotsBetween(h.schedule ?? 'daily', start, today)
  }
  if (expected === 0) return null
  const ids = new Set(scheduled.map((h) => h.id))
  const done = logs.filter((l) => ids.has(l.habit_id) && l.completed_on >= from && l.completed_on <= today).length
  return Math.min(100, Math.round((done / expected) * 100))
}
