import { LuCheck, LuFlame } from 'react-icons/lu'
import { pointsEarned } from '../../lib/points'
import type { Habit, HabitWithStatus } from './types'

const DIFF_COLOR: Record<Habit['difficulty'], string> = {
  trivial: 'bg-slate-100 text-slate-600',
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-rose-100 text-rose-700',
}

export default function HabitRow({ habit: h, onToggle, onEdit }: { habit: HabitWithStatus; onToggle: () => void; onEdit: () => void }) {
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
