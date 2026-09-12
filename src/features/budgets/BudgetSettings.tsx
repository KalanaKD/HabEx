import { LuChevronLeft, LuChevronRight, LuCopy, LuTriangleAlert } from 'react-icons/lu'
import { GROUP_STYLE } from '../../components/ui'
import { monthLabel } from '../../lib/dates'
import { CURRENCY, formatMoney } from '../../lib/money'
import type { BudgetGroup } from '../expenses/types'
import MoneyInput from './MoneyInput'
import { OVERSPEND_RATIO } from './overspend'
import { useBudgets, type BudgetRow } from './useBudgets'

const GROUPS: BudgetGroup[] = ['needs', 'wants', 'savings']

export default function BudgetSettings() {
  const b = useBudgets()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Budgets</h1>
        {b.copyFrom && (
          <button onClick={b.copyPrevious} className="flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700">
            <LuCopy /> Copy {monthLabel(b.copyFrom)}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow">
        <button onClick={b.prevMonth} aria-label="Previous month" className="p-2 text-slate-500"><LuChevronLeft /></button>
        <div className="text-sm font-medium text-slate-600">{monthLabel(b.month)}</div>
        <button onClick={b.nextMonth} aria-label="Next month" className="p-2 text-slate-500"><LuChevronRight /></button>
      </div>

      <ZeroBasedCard income={b.income} allocated={b.allocated} unassigned={b.unassigned} onIncome={b.setIncome} />

      {b.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{b.error}</p>}
      {b.loading && <p className="text-sm text-slate-400">Loading…</p>}

      {GROUPS.map((g) => {
        const rows = b.rows.filter((r) => r.category.budget_group === g)
        if (rows.length === 0) return null
        const groupLimit = rows.reduce((s, r) => s + r.limit, 0)
        return (
          <section key={g}>
            <div className="mb-1 flex items-center justify-between px-1">
              <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${GROUP_STYLE[g]}`}>{g}</span>
              <span className="text-xs text-slate-500">{formatMoney(groupLimit)} allocated</span>
            </div>
            <ul className="divide-y divide-slate-100 rounded-xl bg-white shadow">
              {rows.map((r) => <CategoryRow key={r.category.id} row={r} onLimit={(v) => b.setLimit(r.category.id, v)} />)}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function ZeroBasedCard({ income, allocated, unassigned, onIncome }: {
  income: number; allocated: number; unassigned: number; onIncome: (v: number) => void
}) {
  const state = income === 0 ? 'none' : unassigned === 0 ? 'done' : unassigned > 0 ? 'left' : 'over'
  const tone = { none: 'text-slate-500', done: 'text-emerald-600', left: 'text-amber-600', over: 'text-red-600' }[state]
  const msg = {
    none: 'Enter this month\'s income, then give every rupee a job.',
    done: 'Fully allocated — every rupee has a job.',
    left: `${formatMoney(unassigned)} still unassigned`,
    over: `Over-allocated by ${formatMoney(-unassigned)}`,
  }[state]
  return (
    <section className="rounded-xl bg-white p-4 shadow">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-600">Income to allocate ({CURRENCY})</label>
        <MoneyInput value={income} onCommit={onIncome} className="w-36 text-lg font-semibold" aria-label="Income" />
      </div>
      <div className="mt-3 flex items-baseline justify-between text-sm">
        <span className="text-slate-500">Allocated {formatMoney(allocated)}</span>
        <span className={`font-medium ${tone}`}>{msg}</span>
      </div>
      {income > 0 && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${state === 'over' ? 'bg-red-500' : state === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${Math.min(100, (allocated / income) * 100)}%` }}
          />
        </div>
      )}
    </section>
  )
}

function CategoryRow({ row: r, onLimit }: { row: BudgetRow; onLimit: (v: number) => void }) {
  const pct = r.limit > 0 ? Math.min(100, (r.spent / r.limit) * 100) : 0
  const overBudget = r.limit > 0 && r.spent > r.limit
  const bar = overBudget ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
  return (
    <li className="p-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-slate-800">{r.category.name}</div>
          <div className="text-xs text-slate-500">
            {formatMoney(r.spent)} spent{r.limit > 0 && <> · {formatMoney(Math.max(0, r.limit - r.spent))} left</>}
          </div>
        </div>
        <MoneyInput value={r.limit} onCommit={onLimit} className="w-28" aria-label={`${r.category.name} limit`} />
      </div>
      {r.limit > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {r.overspend.flagged && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-700">
          <LuTriangleAlert className="shrink-0" />
          {Math.round((r.overspend.ratio ?? 0) * 100)}% of your 3-month average ({formatMoney(r.overspend.average)}) — over the {OVERSPEND_RATIO}× threshold
        </p>
      )}
    </li>
  )
}
