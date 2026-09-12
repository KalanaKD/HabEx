import { useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuPlus, LuRepeat, LuTags } from 'react-icons/lu'
import { addMonths, monthLabel, parseDateStr } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { GROUP_STYLE } from '../../components/ui'
import CategoryManager from './CategoryManager'
import ExpenseForm from './ExpenseForm'
import type { Expense, ExpenseWithCategory } from './types'
import { useExpenses } from './useExpenses'

export default function ExpenseList() {
  const x = useExpenses()
  const [screen, setScreen] = useState<'list' | 'new' | 'categories' | Expense>('list')

  if (screen === 'categories') {
    return (
      <CategoryManager
        categories={x.categories}
        onCreate={x.createCategory}
        onUpdate={x.updateCategory}
        onDelete={x.removeCategory}
        onBack={() => setScreen('list')}
      />
    )
  }

  if (screen !== 'list') {
    const initial = screen === 'new' ? undefined : screen
    return (
      <div className="rounded-xl bg-white p-4 shadow">
        <ExpenseForm
          categories={x.categories}
          initial={initial}
          onCancel={() => setScreen('list')}
          onSubmit={async (input) => {
            if (initial) await x.update(initial.id, input)
            else await x.create(input)
            setScreen('list')
          }}
          onDelete={initial ? async () => { await x.remove(initial.id); setScreen('list') } : undefined}
        />
      </div>
    )
  }

  // Group by day for the list
  const byDay = new Map<string, ExpenseWithCategory[]>()
  for (const e of x.expenses) byDay.set(e.spent_on, [...(byDay.get(e.spent_on) ?? []), e])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen('categories')} aria-label="Categories" className="rounded-lg bg-slate-200 p-2.5 text-slate-600"><LuTags /></button>
          <button onClick={() => setScreen('new')} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
            <LuPlus /> Add
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow">
        <button onClick={() => x.setMonth(addMonths(x.month, -1))} aria-label="Previous month" className="p-2 text-slate-500"><LuChevronLeft /></button>
        <div className="text-center">
          <div className="text-sm font-medium text-slate-600">{monthLabel(x.month)}</div>
          <div className="text-xl font-bold text-slate-800">{formatMoney(x.total)}</div>
        </div>
        <button onClick={() => x.setMonth(addMonths(x.month, 1))} aria-label="Next month" className="p-2 text-slate-500"><LuChevronRight /></button>
      </div>

      {x.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{x.error}</p>}
      {x.loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!x.loading && x.expenses.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow">No expenses this month.</p>
      )}

      {[...byDay.entries()].map(([day, items]) => (
        <section key={day}>
          <h2 className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-slate-400">{fmtDay(day)}</h2>
          <ul className="divide-y divide-slate-100 rounded-xl bg-white shadow">
            {items.map((e) => (
              <li key={e.id}>
                <button onClick={() => setScreen(e)} className="flex w-full items-center gap-3 p-3 text-left">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs capitalize ${GROUP_STYLE[e.budget_group]}`}>{e.budget_group}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-slate-800">{e.category_name}</span>
                    {e.note && <span className="block truncate text-xs text-slate-500">{e.note}</span>}
                  </span>
                  {e.is_recurring === 1 && <LuRepeat className="shrink-0 text-slate-400" aria-label="Recurring" />}
                  <span className="shrink-0 font-semibold text-slate-800">{formatMoney(e.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function fmtDay(d: string): string {
  return parseDateStr(d).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
}
