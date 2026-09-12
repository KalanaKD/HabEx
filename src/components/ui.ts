/** Shared Tailwind class strings so forms and badges look the same everywhere. */
import type { BudgetGroup } from '../features/expenses/types'

export const field =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none'
export const label = 'mb-1 block text-sm font-medium text-slate-600'

export const GROUP_STYLE: Record<BudgetGroup, string> = {
  needs: 'bg-sky-100 text-sky-700',
  wants: 'bg-violet-100 text-violet-700',
  savings: 'bg-emerald-100 text-emerald-700',
}
