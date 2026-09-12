/**
 * Date helpers. The app stores dates as local 'YYYY-MM-DD' strings — never
 * Date.toISOString(), which is UTC and would shift a late-evening completion
 * onto the next day.
 */

export type DateStr = string // 'YYYY-MM-DD'

export function toDateStr(d: Date): DateStr {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(): DateStr {
  return toDateStr(new Date())
}

/** Parse 'YYYY-MM-DD' as a local-midnight Date (not UTC). */
export function parseDateStr(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = parseDateStr(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** Monday–Friday. */
export function isWeekday(s: DateStr): boolean {
  const dow = parseDateStr(s).getDay() // 0 = Sunday
  return dow >= 1 && dow <= 5
}

/** Monday of the week containing `s` — used as a week identity for weekly habits. */
export function weekStart(s: DateStr): DateStr {
  const d = parseDateStr(s)
  const dow = d.getDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diffToMonday)
  return toDateStr(d)
}

export function monthStr(s: DateStr): string {
  return s.slice(0, 7) // 'YYYY-MM'
}

/** 'YYYY-MM' → 'YYYY-MM' shifted by n months. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** 'YYYY-MM' → 'Sep 2026' */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en', { month: 'short', year: 'numeric' })
}
