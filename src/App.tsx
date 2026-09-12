import { useState } from 'react'
import type { IconType } from 'react-icons'
import { LuChartPie, LuCircleCheck, LuSun, LuWallet } from 'react-icons/lu'
import BudgetSettings from './features/budgets/BudgetSettings'
import TodayScreen from './features/dashboard/TodayScreen'
import ExpenseList from './features/expenses/ExpenseList'
import HabitList from './features/habits/HabitList'
import SettingsScreen from './features/settings/SettingsScreen'

type Tab = 'today' | 'habits' | 'expenses' | 'budgets'
type Screen = Tab | 'settings' // settings isn't in the tab bar

const TABS: { id: Tab; label: string; icon: IconType }[] = [
  { id: 'today', label: 'Today', icon: LuSun },
  { id: 'habits', label: 'Habits', icon: LuCircleCheck },
  { id: 'expenses', label: 'Expenses', icon: LuWallet },
  { id: 'budgets', label: 'Budgets', icon: LuChartPie },
]


function App() {
  const [tab, setTab] = useState<Screen>('today')

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* pb-24 leaves room for the fixed tab bar */}
      <main className="mx-auto w-full max-w-md flex-1 p-4 pb-24">
        {tab === 'today' && <TodayScreen onOpenTab={setTab} onOpenSettings={() => setTab('settings')} />}
        {tab === 'settings' && <SettingsScreen onBack={() => setTab('today')} />}
        {tab === 'habits' && <HabitList />}
        {tab === 'expenses' && <ExpenseList />}
        {tab === 'budgets' && <BudgetSettings />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-edge bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-md">
          {TABS.map((t) => (
            <li key={t.id} className="flex-1">
              <button
                onClick={() => setTab(t.id)}
                className={`flex w-full flex-col items-center py-2 text-xs ${tab === t.id ? 'text-accent' : 'text-ink-soft'}`}
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
