import { useState } from 'react'
import { BASE_POINTS, type Difficulty } from '../../lib/points'
import { HABIT_TEMPLATES, type HabitType, type Schedule } from '../../lib/scienceTips'
import type { Habit, HabitInput } from './types'

interface Props {
  /** When set, the form edits this habit; otherwise it creates a new one. */
  initial?: Habit
  onSubmit: (input: HabitInput) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
}

const DIFFICULTIES: Difficulty[] = ['trivial', 'easy', 'medium', 'hard']
const TYPES: { value: HabitType; label: string; hint: string }[] = [
  { value: 'daily', label: 'Daily', hint: 'On a schedule; streaks matter' },
  { value: 'habit', label: 'Habit', hint: 'Whenever; no schedule pressure' },
  { value: 'todo', label: 'To-do', hint: 'One-off; done once then archived' },
]
const SCHEDULES: { value: Schedule; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Once a week' },
]

export default function HabitForm({ initial, onSubmit, onDelete, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<HabitType>(initial?.type ?? 'daily')
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'easy')
  const [schedule, setSchedule] = useState<Schedule>(initial?.schedule ?? 'daily')
  const [scienceTag, setScienceTag] = useState(initial?.science_tag ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function applyTemplate(idx: number) {
    const t = HABIT_TEMPLATES[idx]
    if (!t) return
    setName(t.name)
    setType(t.type)
    setDifficulty(t.difficulty)
    setSchedule(t.schedule)
    setScienceTag(t.scienceTag)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSubmit({ name, type, difficulty, schedule: type === 'todo' ? null : schedule, science_tag: scienceTag || null })
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none'
  const label = 'mb-1 block text-sm font-medium text-slate-600'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">{initial ? 'Edit habit' : 'New habit'}</h2>

      {!initial && (
        <div>
          <label className={label}>Start from a template</label>
          <select className={field} defaultValue="" onChange={(e) => applyTemplate(Number(e.target.value))}>
            <option value="" disabled>Choose…</option>
            {HABIT_TEMPLATES.map((t, i) => (
              <option key={t.name} value={i}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={label}>Name</label>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </div>

      <div>
        <label className={label}>Type</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`rounded-lg border px-2 py-2 text-sm ${type === t.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'}`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-xs text-slate-400">{t.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>Difficulty</label>
        <div className="grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`rounded-lg border px-2 py-2 text-sm capitalize ${difficulty === d ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'}`}
            >
              {d}
              <div className="text-xs text-slate-400">{BASE_POINTS[d]} pts</div>
            </button>
          ))}
        </div>
      </div>

      {type !== 'todo' && (
        <div>
          <label className={label}>Schedule</label>
          <select className={field} value={schedule} onChange={(e) => setSchedule(e.target.value as Schedule)}>
            {SCHEDULES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={label}>Science tag <span className="font-normal text-slate-400">(optional)</span></label>
        <input className={field} value={scienceTag} onChange={(e) => setScienceTag(e.target.value)} placeholder="e.g. Fogg tiny habit" />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving || !name.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-50">
          {saving ? 'Saving…' : initial ? 'Save' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2.5 text-slate-600">
          Cancel
        </button>
      </div>

      {initial && onDelete && (
        <div className="border-t border-slate-200 pt-3">
          {confirmDelete ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Delete permanently, including its logs?</span>
              <div className="flex gap-2">
                <button type="button" onClick={onDelete} className="rounded bg-red-600 px-3 py-1 text-white">Delete</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 text-slate-500">Keep</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-red-500">
              Delete habit…
            </button>
          )}
        </div>
      )}
    </form>
  )
}
