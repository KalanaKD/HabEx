import { useState } from 'react'
import { LuChartColumn, LuCheck, LuFlame, LuList, LuPlus } from 'react-icons/lu'
import { pointsEarned } from '../../lib/points'
import HabitDashboard from '../dashboard/HabitDashboard'
import HabitForm from './HabitForm'
import type { Habit, HabitWithStatus } from './types'
import { useHabits } from './useHabits'

const DIFF_COLOR: Record<Habit['difficulty'], string> = {
  trivial: 'bg-slate-100 text-slate-600',
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-rose-100 text-rose-700',
}

export default function HabitList() {
  const { habits, loading, error, create, update, remove, complete, uncomplete } = useHabits()
  // null = list view; 'new' = create form; a Habit = edit form for it
  const [editing, setEditing] = useState<'new' | Habit | null>(null)
  const [view, setView] = useState<'list' | 'stats'>('list')

  if (editing) {
    const habit = editing === 'new' ? undefined : editing
    return (
      <div className="rounded-xl bg-white p-4 shadow">
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
          <h1 className="text-2xl font-bold text-slate-800">Habits</h1>
          {habits.length > 0 && (
            <p className="text-sm text-slate-500">{done} of {habits.length} done today</p>
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

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && habits.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow">
          No habits yet. Tap <span className="font-medium">New</span> to add one, or pick a template.
        </p>
      )}

      <ul className="space-y-2">
        {habits.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            onToggle={() => (h.completedToday ? uncomplete(h) : complete(h))}
            onEdit={() => setEditing(h)}
          />
        ))}
      </ul>
      </>)}
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: 'list' | 'stats'; onChange: (v: 'list' | 'stats') => void }) {
  const btn = (v: 'list' | 'stats', Icon: typeof LuList, label: string) => (
    <button
      onClick={() => onChange(v)}
      aria-label={label}
      className={`rounded-md p-2 ${view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
    >
      <Icon />
    </button>
  )
  return (
    <div className="flex rounded-lg bg-slate-200 p-0.5">
      {btn('list', LuList, 'List')}
      {btn('stats', LuChartColumn, 'Stats')}
    </div>
  )
}

function HabitRow({ habit: h, onToggle, onEdit }: { habit: HabitWithStatus; onToggle: () => void; onEdit: () => void }) {
  // What completing *now* would award: streak grows by one if today isn't done yet.
  const nextPoints = pointsEarned(h.difficulty, h.completedToday ? h.streak : h.streak + 1)
  return (
    <li className={`flex items-center gap-3 rounded-xl bg-white p-3 shadow ${h.completedToday ? 'opacity-70' : ''}`}>
      <button
        onClick={onToggle}
        aria-label={h.completedToday ? 'Mark not done' : 'Mark done'}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg ${
          h.completedToday ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent active:bg-slate-100'
        }`}
      >
        <LuCheck strokeWidth={3} />
      </button>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className={`truncate font-medium text-slate-800 ${h.completedToday ? 'line-through' : ''}`}>{h.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          <span className={`rounded px-1.5 py-0.5 capitalize ${DIFF_COLOR[h.difficulty]}`}>{h.difficulty}</span>
          <span className="capitalize">{h.type === 'todo' ? 'to-do' : h.schedule ?? h.type}</span>
          {h.streak > 0 && <span className="flex items-center gap-0.5"><LuFlame className="text-orange-500" />{h.streak}</span>}
          {h.science_tag && <span className="truncate text-slate-400">· {h.science_tag}</span>}
        </div>
      </button>
      <div className="shrink-0 text-right text-xs text-slate-500">
        <div className="font-semibold text-indigo-600">{h.completedToday ? '+' : ''}{nextPoints} pts</div>
        <div>{h.totalPoints} total</div>
      </div>
    </li>
  )
}
