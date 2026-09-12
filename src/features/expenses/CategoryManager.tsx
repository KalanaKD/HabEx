import { useState } from 'react'
import { LuArrowLeft, LuPencil, LuPlus } from 'react-icons/lu'
import { GROUP_STYLE, field, label } from '../../components/ui'
import type { BudgetGroup, Category } from './types'

interface Props {
  categories: Category[]
  onCreate: (name: string, g: BudgetGroup) => Promise<void>
  onUpdate: (id: string, name: string, g: BudgetGroup) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onBack: () => void
}

const GROUPS: BudgetGroup[] = ['needs', 'wants', 'savings']

export default function CategoryManager({ categories, onCreate, onUpdate, onDelete, onBack }: Props) {
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [name, setName] = useState('')
  const [group, setGroup] = useState<BudgetGroup>('needs')
  const [error, setError] = useState<string | null>(null)

  function startEdit(c: Category | 'new') {
    setEditing(c)
    setName(c === 'new' ? '' : c.name)
    setGroup(c === 'new' ? 'needs' : c.budget_group)
    setError(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !editing) return
    if (editing === 'new') await onCreate(name, group)
    else await onUpdate(editing.id, name, group)
    setEditing(null)
  }

  async function del(id: string) {
    try {
      await onDelete(id)
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} aria-label="Back" className="rounded-lg p-2 text-slate-600"><LuArrowLeft /></button>
        <h1 className="flex-1 text-xl font-bold text-slate-800">Categories</h1>
        <button onClick={() => startEdit('new')} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          <LuPlus /> New
        </button>
      </div>

      {editing && (
        <form onSubmit={save} className="space-y-3 rounded-xl bg-white p-4 shadow">
          <div>
            <label className={label}>Name</label>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </div>
          <div>
            <label className={label}>Group (50/30/20 bucket)</label>
            <div className="grid grid-cols-3 gap-2">
              {GROUPS.map((g) => (
                <button key={g} type="button" onClick={() => setGroup(g)}
                  className={`rounded-lg border px-2 py-2 text-sm capitalize ${group === g ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-indigo-600 py-2 font-medium text-white">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-4 text-slate-600">Cancel</button>
            {editing !== 'new' && (
              <button type="button" onClick={() => del(editing.id)} className="rounded-lg px-3 text-sm text-red-500">Delete</button>
            )}
          </div>
        </form>
      )}

      <ul className="divide-y divide-slate-100 rounded-xl bg-white shadow">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 p-3">
            <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${GROUP_STYLE[c.budget_group]}`}>{c.budget_group}</span>
            <span className="flex-1 text-slate-800">{c.name}</span>
            <button onClick={() => startEdit(c)} aria-label={`Edit ${c.name}`} className="p-1 text-slate-400"><LuPencil /></button>
          </li>
        ))}
      </ul>
    </div>
  )
}
