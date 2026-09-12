/** Minimal global toast queue: `toast('...')` from anywhere, rendered by <Toaster/>. */
import { useEffect, useState } from 'react'

export interface ToastItem {
  id: number
  text: string
  /** 'xp' gets the accent styling used for habit rewards. */
  kind?: 'xp' | 'info'
}

const listeners = new Set<(t: ToastItem) => void>()
let nextId = 1

export function toast(text: string, kind: ToastItem['kind'] = 'info'): void {
  const item = { id: nextId++, text, kind }
  listeners.forEach((l) => l(item))
}

export function useToasts(ttlMs = 2200): ToastItem[] {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    const add = (t: ToastItem) => {
      setItems((cur) => [...cur, t])
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), ttlMs)
    }
    listeners.add(add)
    return () => { listeners.delete(add) }
  }, [ttlMs])
  return items
}

// Level-up announcements share the same bus pattern; rendered by <LevelUp/>.
const levelListeners = new Set<(level: number) => void>()
export function announceLevelUp(level: number): void {
  levelListeners.forEach((l) => l(level))
}
export function subscribeLevelUp(listener: (level: number) => void): () => void {
  levelListeners.add(listener)
  return () => { levelListeners.delete(listener) }
}
