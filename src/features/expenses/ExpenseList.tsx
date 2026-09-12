import { useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuPlus, LuRepeat, LuTags } from 'react-icons/lu'
import { addMonths, monthLabel, parseDateStr } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { GROUP_STYLE } from '../../components/ui'
import ViewToggle, { type View } from '../../components/ViewToggle'
import ExpenseDashboard from '../dashboard/ExpenseDashboard'
import CategoryManager from './CategoryManager'
import ExpenseForm from './ExpenseForm'
import type { Expense, ExpenseWithCategory } from './types'
import { useExpenses } from './useExpenses'

export default function ExpenseList() {
  const x = useExpenses()
  const [screen, setScreen] = useState<'list' | 'new' | 'categories' | Expense>('list')
  const [view, setView] = useState<View>('list')

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
      <div className="rounded-xl bg-surface p-4 shadow">
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
        <h1 className="text-2xl font-bold text-ink">Expenses</h1>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <button onClick={() => setScreen('categories')} aria-label="Categories" className="rounded-lg bg-well-strong p-2.5 text-ink-muted"><LuTags /></button>
          <button onClick={() => setScreen('new')} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
            <LuPlus /> Add
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-surface p-3 shadow">
        <button onClick={() => x.setMonth(addMonths(x.month, -1))} aria-label="Previous month" className="p-2 text-ink-soft"><LuChevronLeft /></button>
        <div className="text-center">
          <div className="text-sm font-medium text-ink-muted">{monthLabel(x.month)}</div>
          <div className="text-xl font-bold text-ink">{formatMoney(x.total)}</div>
        </div>
        <button onClick={() => x.setMonth(addMonths(x.month, 1))} aria-label="Next month" className="p-2 text-ink-soft"><LuChevronRight /></button>
      </div>

      {view === 'stats' && <ExpenseDashboard month={x.month} />}
      {view === 'list' && (<>
      {x.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{x.error}</p>}
      {x.loading && <p className="text-sm text-ink-faint">Loading…</p>}
      {!x.loading && x.expenses.length === 0 && (
        <p className="rounded-xl bg-surface p-6 text-center text-sm text-ink-faint shadow">No expenses this month.</p>
      )}

      {[...byDay.entries()].map(([day, items]) => (
        <section key={day}>
          <h2 className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-ink-faint">{fmtDay(day)}</h2>
          <ul className="divide-y divide-edge rounded-xl bg-surface shadow">
            {items.map((e) => (
              <li key={e.id}>
                <button onClick={() => setScreen(e)} className="flex w-full items-center gap-3 p-3 text-left">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs capitalize ${GROUP_STYLE[e.budget_group]}`}>{e.budget_group}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink">{e.category_name}</span>
                    {e.note && <span className="block truncate text-xs text-ink-soft">{e.note}</span>}
                  </span>
                  {e.is_recurring === 1 && <LuRepeat className="shrink-0 text-ink-faint" aria-label="Recurring" />}
                  <span className="shrink-0 font-semibold text-ink">{formatMoney(e.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      </>)}
    </div>
  )
}

function fmtDay(d: string): string {
  return parseDateStr(d).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
}
