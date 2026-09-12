import { addDays, isWeekday, weekStart, type DateStr } from '../../lib/dates'
import type { Schedule } from '../../lib/scienceTips'

/**
 * Current streak length for a habit, counted in *scheduled periods*:
 *  - daily:    consecutive calendar days
 *  - weekdays: consecutive Mon–Fri days (weekends are skipped, not broken)
 *  - weekly:   consecutive calendar weeks (any day in the week counts)
 *
 * The streak is "alive" if the most recent scheduled period (today, or the
 * last one before today) is completed. If today is a scheduled day but not
 * yet completed, we look at yesterday instead — an uncompleted today doesn't
 * break a streak until the day is over.
 *
 * @param completed  dates the habit was completed (any order, may repeat)
 * @param schedule   null/undefined is treated as 'daily'
 * @param today      the reference date (injectable for tests)
 */
export function computeStreak(
  completed: Iterable<DateStr>,
  schedule: Schedule | null | undefined,
  today: DateStr,
): number {
  const sched = schedule ?? 'daily'
  const done = new Set<string>()
  for (const d of completed) done.add(sched === 'weekly' ? weekStart(d) : d)
  if (done.size === 0) return 0

  if (sched === 'weekly') {
    let cursor = weekStart(today)
    if (!done.has(cursor)) cursor = addDays(cursor, -7)
    let streak = 0
    while (done.has(cursor)) {
      streak++
      cursor = addDays(cursor, -7)
    }
    return streak
  }

  const isScheduled = (d: DateStr) => (sched === 'weekdays' ? isWeekday(d) : true)
  const prevScheduled = (d: DateStr) => {
    let p = addDays(d, -1)
    while (!isScheduled(p)) p = addDays(p, -1)
    return p
  }

  // Start at today if it's scheduled and done; otherwise at the previous
  // scheduled day (today may simply not be finished yet).
  let cursor = isScheduled(today) && done.has(today) ? today : prevScheduled(today)
  let streak = 0
  while (done.has(cursor)) {
    streak++
    cursor = prevScheduled(cursor)
  }
  return streak
}
