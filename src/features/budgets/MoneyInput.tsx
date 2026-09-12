import { useEffect, useState } from 'react'
import { parseMoney } from '../../lib/money'

interface Props {
  value: number
  onCommit: (value: number) => void
  className?: string
  placeholder?: string
  'aria-label'?: string
}

/** Number field that keeps a local draft while typing and commits on blur / Enter. */
export default function MoneyInput({ value, onCommit, className = '', placeholder = '0', ...rest }: Props) {
  const [draft, setDraft] = useState(value ? String(value) : '')
  // Reflect external changes (month switch, copy-previous) into the draft
  useEffect(() => setDraft(value ? String(value) : ''), [value])

  function commit() {
    const n = parseMoney(draft)
    const next = Number.isFinite(n) && n > 0 ? n : 0
    if (next !== value) onCommit(next)
  }

  return (
    <input
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className={`rounded-lg border border-edge-strong bg-surface px-2 py-1.5 text-right text-ink focus:border-indigo-500 focus:outline-none ${className}`}
      aria-label={rest['aria-label']}
    />
  )
}
