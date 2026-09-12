import { useState } from 'react'
import type { IconType } from 'react-icons'
import { LuChartPie, LuCircleCheck, LuSun, LuWallet } from 'react-icons/lu'
import BudgetSettings from './features/budgets/BudgetSettings'
import ExpenseList from './features/expenses/ExpenseList'
import HabitList from './features/habits/HabitList'

type Tab = 'today' | 'habits' | 'expenses' | 'budgets'

const TABS: { id: Tab; label: string; icon: IconType }[] = [
  { id: 'today', label: 'Today', icon: LuSun },
  { id: 'habits', label: 'Habits', icon: LuCircleCheck },
  { id: 'expenses', label: 'Expenses', icon: LuWallet },
  { id: 'budgets', label: 'Budgets', icon: LuChartPie },
]

function Placeholder({ name, step }: { name: string; step: number }) {
  return (
    <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow">
      {name} — coming in build step {step}
    </div>
  )
}

function App() {
  const [tab, setTab] = useState<Tab>('habits')

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* pb-24 leaves room for the fixed tab bar */}
      <main className="mx-auto w-full max-w-md flex-1 p-4 pb-24">
        {tab === 'today' && <Placeholder name="Today screen" step={8} />}
        {tab === 'habits' && <HabitList />}
        {tab === 'expenses' && <ExpenseList />}
        {tab === 'budgets' && <BudgetSettings />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-md">
          {TABS.map((t) => (
            <li key={t.id} className="flex-1">
              <button
                onClick={() => setTab(t.id)}
                className={`flex w-full flex-col items-center py-2 text-xs ${tab === t.id ? 'text-indigo-600' : 'text-slate-500'}`}
              >
                <t.icon className="mb-0.5 text-xl" />
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default App
