import { useState } from 'react'
import { LuPlus } from 'react-icons/lu'
import ViewToggle, { type View } from '../../components/ViewToggle'
import HabitDashboard from '../dashboard/HabitDashboard'
import HabitForm from './HabitForm'
import HabitRow from './HabitRow'
import type { Habit } from './types'
import { useHabits } from './useHabits'


export default function HabitList() {
  const { habits, loading, error, create, update, remove, complete, uncomplete } = useHabits()
  // null = list view; 'new' = create form; a Habit = edit form for it
  const [editing, setEditing] = useState<'new' | Habit | null>(null)
  const [view, setView] = useState<View>('list')

  if (editing) {
    const habit = editing === 'new' ? undefined : editing
    return (
      <div className="rounded-xl bg-surface p-4 shadow">
        <HabitForm
          initial={habit}
          onCancel={() => setEditing(null)}
          onSubmit={async (input) => {
            if (habit) await update(habit.id, input)
            else await create(input)
            setEditing(null)
          }}
          onDelete={habit ? async () => { await remove(habit.id); setEditing(null) } : undefined}
        />
      </div>
    )
  }

  const done = habits.filter((h) => h.completedToday).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Habits</h1>
          {habits.length > 0 && (
            <p className="text-sm text-ink-soft">{done} of {habits.length} done today</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
          >
            <LuPlus /> New
          </button>
        </div>
      </div>

      {view === 'stats' && <HabitDashboard />}
      {view === 'list' && (<>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {loading && <p className="text-sm text-ink-faint">Loading…</p>}
      {!loading && habits.length === 0 && (
        <p className="rounded-xl bg-surface p-6 text-center text-sm text-ink-faint shadow">
          No habits yet. Tap <span className="font-medium">New</span> to add one, or pick a template.
        </p>
      )}

      <ul className="space-y-2">
        {habits.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            onToggle={(origin) => (h.completedToday ? uncomplete(h) : complete(h, origin))}
            onEdit={() => setEditing(h)}
          />
        ))}
      </ul>
      </>)}
    </div>
  )
}


