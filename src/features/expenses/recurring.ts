import { addMonths, daysInMonth, monthStr } from '../../lib/dates'
import type { Expense } from './types'

/**
 * Which months a recurring template still needs a copy for, and the date each
 * copy should carry. Pure: the repo decides what to insert from this.
 *
 * A template is an expense with is_recurring = 1 and recurring_of = NULL.
 * Copies are generated for every month after the template's own month up to
 * and including `currentMonth`, skipping months that already have a copy.
 * The copy keeps the template's day-of-month, clamped to the month's length.
 */
export function missingOccurrences(
  template: Expense,
  existingCopyMonths: Iterable<string>,
  currentMonth: string,
): { month: string; spent_on: string }[] {
  const have = new Set(existingCopyMonths)
  const day = Number(template.spent_on.slice(8, 10))
  const out: { month: string; spent_on: string }[] = []
  for (let m = addMonths(monthStr(template.spent_on), 1); m <= currentMonth; m = addMonths(m, 1)) {
    if (have.has(m)) continue
    const d = Math.min(day, daysInMonth(m))
    out.push({ month: m, spent_on: `${m}-${String(d).padStart(2, '0')}` })
  }
  return out
}
