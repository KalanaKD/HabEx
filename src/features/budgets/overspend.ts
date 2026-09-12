/** Overspend rule from project-brief.md: simple moving-average check. */

export const OVERSPEND_RATIO = 1.3

export interface OverspendResult {
  flagged: boolean
  /** Trailing average the current month was compared against. */
  average: number
  /** current / average, or null when there's no history to compare with. */
  ratio: number | null
}

/**
 * @param current  this month's spend in the category
 * @param history  spend in each of the previous N months (0 for months with
 *                 no expenses). Order doesn't matter.
 * A category with no spending history (average 0) is never flagged — there's
 * nothing meaningful to compare against yet.
 */
export function overspendCheck(current: number, history: number[]): OverspendResult {
  if (history.length === 0) return { flagged: false, average: 0, ratio: null }
  const average = history.reduce((s, v) => s + v, 0) / history.length
  if (average <= 0) return { flagged: false, average, ratio: null }
  const ratio = current / average
  return { flagged: ratio > OVERSPEND_RATIO, average, ratio }
}

/** Zero-based budgeting: what's left of the income after allocations. */
export function unassigned(income: number, allocations: Iterable<number>): number {
  let total = 0
  for (const a of allocations) total += a
  return income - total
}
