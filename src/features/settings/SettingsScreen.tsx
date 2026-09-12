import { useEffect, useState } from 'react'
import { LuArrowLeft, LuLock, LuMonitor, LuMoon, LuSun } from 'react-icons/lu'
import { authenticate, canLock, isLockEnabled, setLockEnabled, type LockCapability } from '../../lib/appLock'
import { getThemePref, setThemePref, type ThemePref } from '../../lib/theme'

const THEMES: { value: ThemePref; label: string; Icon: typeof LuSun }[] = [
  { value: 'system', label: 'System', Icon: LuMonitor },
  { value: 'light', label: 'Light', Icon: LuSun },
  { value: 'dark', label: 'Dark', Icon: LuMoon },
]

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [theme, setTheme] = useState<ThemePref>(getThemePref)
  const [lock, setLock] = useState(isLockEnabled)
  const [cap, setCap] = useState<LockCapability | null>(null)
  const [lockMsg, setLockMsg] = useState<string | null>(null)

  useEffect(() => { void canLock().then(setCap) }, [])

  function choose(t: ThemePref) {
    setThemePref(t)
    setTheme(t)
  }

  async function toggleLock() {
    setLockMsg(null)
    if (lock) {
      // Turning off also needs proof it's you.
      const res = await authenticate()
      if (!res.ok) return setLockMsg(res.message ?? 'Cancelled')
      setLockEnabled(false)
      setLock(false)
      return
    }
    // Turning on: verify once so a broken setup can't lock you out.
    const res = await authenticate()
    if (!res.ok) return setLockMsg(res.message ?? 'Cancelled')
    setLockEnabled(true)
    setLock(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} aria-label="Back" className="rounded-lg p-2 text-ink-muted"><LuArrowLeft /></button>
        <h1 className="text-xl font-bold text-ink">Settings</h1>
      </div>

      <section className="rounded-xl bg-surface p-4 shadow">
        <h2 className="mb-2 text-sm font-semibold text-ink-2">Appearance</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => choose(value)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-sm ${
                theme === value ? 'border-accent bg-accent-soft text-accent' : 'border-edge-strong text-ink-muted'
              }`}
            >
              <Icon className="text-lg" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow">
        <h2 className="mb-2 text-sm font-semibold text-ink-2">Security</h2>
        <label className="flex items-center gap-3">
          <LuLock className="text-xl text-ink-soft" />
          <span className="flex-1">
            <span className="block text-sm font-medium text-ink">Require unlock</span>
            <span className="block text-xs text-ink-soft">
              {cap === null ? 'Checking…' : cap.available ? `Uses ${cap.method}, with device PIN as fallback. Re-locks after 30 s in the background.` : cap.reason}
            </span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={lock} disabled={!cap?.available} onChange={toggleLock} />
        </label>
        {lockMsg && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{lockMsg}</p>}
      </section>
    </div>
  )
}
