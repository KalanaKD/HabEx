/** Shared Tailwind class strings so forms and badges look the same everywhere. */
import type { BudgetGroup } from '../features/expenses/types'

export const field =
  'w-full rounded-lg border border-edge-strong bg-surface px-3 py-2 text-base text-ink focus:border-indigo-500 focus:outline-none'
export const label = 'mb-1 block text-sm font-medium text-ink-muted'

export const GROUP_STYLE: Record<BudgetGroup, string> = {
  needs: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  wants: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  savings: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
}
