import { useState } from 'react'
import { LuRepeat } from 'react-icons/lu'
import { todayStr } from '../../lib/dates'
import { CURRENCY, parseMoney } from '../../lib/money'
import { field, label } from '../../components/ui'
import type { Category, Expense, ExpenseInput } from './types'

interface Props {
  categories: Category[]
  initial?: Expense
  onSubmit: (input: ExpenseInput) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
}


export default function ExpenseForm({ categories, initial, onSubmit, onDelete, onCancel }: Props) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? categories[0]?.id ?? '')
  const [spentOn, setSpentOn] = useState(initial?.spent_on ?? todayStr())
  const [note, setNote] = useState(initial?.note ?? '')
  const [recurring, setRecurring] = useState(initial?.is_recurring === 1)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const parsed = parseMoney(amount)
  const valid = Number.isFinite(parsed) && parsed > 0 && categoryId && spentOn
  const isCopy = !!initial?.recurring_of

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      await onSubmit({ category_id: categoryId, amount: parsed, spent_on: spentOn, note: note || null, is_recurring: recurring })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">{initial ? 'Edit expense' : 'New expense'}</h2>

      <div>
        <label className={label}>Amount ({CURRENCY})</label>
        <input className={`${field} text-2xl font-semibold`} inputMode="decimal" value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus required />
      </div>

      <div>
        <label className={label}>Category</label>
        <select className={field} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name} · {c.budget_group}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>Date</label>
        <input type="date" className={field} value={spentOn} onChange={(e) => setSpentOn(e.target.value)} required />
      </div>

      <div>
        <label className={label}>Note <span className="font-normal text-slate-400">(optional)</span></label>
        <input className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Weekly shop" />
      </div>

      <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
        <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-5 w-5 accent-indigo-600" />
        <span className="flex-1 text-sm">
          <span className="flex items-center gap-1 font-medium text-slate-700"><LuRepeat /> Repeats monthly</span>
          <span className="text-slate-500">
            {isCopy
              ? 'Auto-added from a recurring expense. Untick to detach this month only.'
              : 'A copy is added on the same day each month. Edit this one to change future months.'}
          </span>
        </span>
      </label>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving || !valid} className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-50">
          {saving ? 'Saving…' : initial ? 'Save' : 'Add'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2.5 text-slate-600">Cancel</button>
      </div>

      {initial && onDelete && (
        <div className="border-t border-slate-200 pt-3">
          {confirmDelete ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                {initial.is_recurring && !isCopy ? 'Delete? Past copies are kept; no new ones.' : 'Delete this expense?'}
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={onDelete} className="rounded bg-red-600 px-3 py-1 text-white">Delete</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 text-slate-500">Keep</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-red-500">Delete expense…</button>
          )}
        </div>
      )}
    </form>
  )
}
