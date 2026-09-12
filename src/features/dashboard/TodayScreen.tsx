import { useState } from 'react'
import { LuCircleAlert, LuPlus, LuSettings, LuTriangleAlert, LuTrophy } from 'react-icons/lu'
import { isWeekday, parseDateStr, todayStr } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { levelFromPoints } from '../../lib/points'
import ExpenseForm from '../expenses/ExpenseForm'
import { createExpense } from '../expenses/expensesRepo'
import HabitRow from '../habits/HabitRow'
import { useHabits } from '../habits/useHabits'
import { useTodayMoney } from './useTodayMoney'

export default function TodayScreen({ onOpenTab, onOpenSettings }: { onOpenTab: (tab: 'habits' | 'expenses' | 'budgets') => void; onOpenSettings: () => void }) {
  const habits = useHabits()
  const money = useTodayMoney()
  const [addingExpense, setAddingExpense] = useState(false)
  const today = todayStr()

  // Weekday-scheduled habits aren't due on weekends; everything else is.
  const due = habits.habits.filter((h) => h.schedule !== 'weekdays' || isWeekday(today))
  const done = due.filter((h) => h.completedToday).length
  const totalPoints = habits.habits.reduce((s, h) => s + h.totalPoints, 0)

  if (addingExpense && money.data) {
    return (
      <div className="rounded-xl bg-surface p-4 shadow">
        <ExpenseForm
          categories={money.data.categories}
          onCancel={() => setAddingExpense(false)}
          onSubmit={async (input) => { await createExpense(input); await money.reload(); setAddingExpense(false) }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Today</h1>
          <p className="text-sm text-ink-soft">{parseDateStr(today).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={onOpenSettings} aria-label="Settings" className="rounded-lg p-2 text-ink-soft"><LuSettings className="text-xl" /></button>
      </div>

      {/* Habits */}
      <section>
        <div className="mb-1 flex items-center justify-between px-1">
          <button onClick={() => onOpenTab('habits')} className="text-sm font-semibold text-ink-2">
            Habits · {done}/{due.length} done
          </button>
          <span className="flex items-center gap-1 text-xs text-ink-soft">
            <LuTrophy className="text-amber-500" /> Level {levelFromPoints(totalPoints)} · {totalPoints} XP
          </span>
        </div>
        {habits.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{habits.error}</p>}
        {!habits.loading && due.length === 0 && (
          <p className="rounded-xl bg-surface p-4 text-center text-sm text-ink-faint shadow">
            Nothing due today. <button onClick={() => onOpenTab('habits')} className="font-medium text-accent">Add a habit</button>
          </p>
        )}
        <ul className="space-y-2">
          {due.map((h) => (
            <HabitRow key={h.id} habit={h} onToggle={(origin) => (h.completedToday ? habits.uncomplete(h) : habits.complete(h, origin))} onEdit={() => onOpenTab('habits')} />
          ))}
        </ul>
      </section>

      {/* Money */}
      <section>
        <div className="mb-1 flex items-center justify-between px-1">
          <button onClick={() => onOpenTab('expenses')} className="text-sm font-semibold text-ink-2">Money</button>
          <button onClick={() => setAddingExpense(true)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white">
            <LuPlus /> Expense
          </button>
        </div>
        {money.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{money.error}</p>}
        {money.data && <MoneyCard {...money.data} onOpenTab={onOpenTab} />}
      </section>
    </div>
  )
}

function MoneyCard({ today, monthSpent, income, allocated, overBudget, overspend, onOpenTab }: {
  today: number; monthSpent: number; income: number; allocated: number; overBudget: string[]; overspend: string[]
  onOpenTab: (tab: 'expenses' | 'budgets') => void
}) {
  const basis = income > 0 ? income : allocated
  const left = basis - monthSpent
  const pct = basis > 0 ? Math.min(100, (monthSpent / basis) * 100) : 0
  return (
    <div className="rounded-xl bg-surface p-4 shadow">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Spent today" value={formatMoney(today)} />
        <Stat label="This month" value={formatMoney(monthSpent)} />
      </div>
      {basis > 0 ? (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-ink-soft">
            <span>{left >= 0 ? `${formatMoney(left)} left` : `${formatMoney(-left)} over`} of {income > 0 ? 'income' : 'budget'}</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-well">
            <div className={`h-full rounded-full ${left < 0 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        <button onClick={() => onOpenTab('budgets')} className="mt-3 text-xs text-accent">Set this month's income and budgets →</button>
      )}
      {(overBudget.length > 0 || overspend.length > 0) && (
        <ul className="mt-3 space-y-1 border-t border-edge pt-3 text-xs">
          {overBudget.length > 0 && (
            <li className="flex items-start gap-1 text-red-600"><LuCircleAlert className="mt-0.5 shrink-0" /> Over budget: {overBudget.join(', ')}</li>
          )}
          {overspend.length > 0 && (
            <li className="flex items-start gap-1 text-amber-700"><LuTriangleAlert className="mt-0.5 shrink-0" /> Above your 3-month average: {overspend.join(', ')}</li>
          )}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-soft">{label}</div>
      <div className="text-lg font-bold text-ink">{value}</div>
    </div>
  )
}
