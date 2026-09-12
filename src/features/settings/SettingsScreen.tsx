import { useState } from 'react'
import { LuArrowLeft, LuMonitor, LuMoon, LuSun } from 'react-icons/lu'
import { getThemePref, setThemePref, type ThemePref } from '../../lib/theme'

const THEMES: { value: ThemePref; label: string; Icon: typeof LuSun }[] = [
  { value: 'system', label: 'System', Icon: LuMonitor },
  { value: 'light', label: 'Light', Icon: LuSun },
  { value: 'dark', label: 'Dark', Icon: LuMoon },
]

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [theme, setTheme] = useState<ThemePref>(getThemePref)

  function choose(t: ThemePref) {
    setThemePref(t)
    setTheme(t)
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
    </div>
  )
}
