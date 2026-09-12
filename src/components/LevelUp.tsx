import { useEffect, useState } from 'react'
import { LuTrophy } from 'react-icons/lu'
import { fireworks } from '../lib/celebrate'
import { subscribeLevelUp } from './toast'

/** Full-screen "Level N!" moment. Tap anywhere to dismiss. */
export default function LevelUp() {
  const [level, setLevel] = useState<number | null>(null)
  useEffect(() => {
    return subscribeLevelUp((l) => { setLevel(l); fireworks() })
  }, [])
  if (level === null) return null
  return (
    <button onClick={() => setLevel(null)} className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/60 p-6 text-center backdrop-blur-sm">
      <div className="animate-pop rounded-2xl bg-surface px-10 py-8 shadow-2xl">
        <LuTrophy className="mx-auto text-6xl text-amber-400" />
        <div className="mt-3 text-sm uppercase tracking-widest text-ink-soft">Level up</div>
        <div className="text-5xl font-black text-ink">{level}</div>
        <div className="mt-3 text-xs text-ink-faint">Tap to continue</div>
      </div>
    </button>
  )
}
