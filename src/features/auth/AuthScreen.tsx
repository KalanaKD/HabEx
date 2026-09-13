import { useState } from 'react'
import { LuLogIn, LuUserPlus } from 'react-icons/lu'
import { field, label } from '../../components/ui'
import { signIn, signUp } from '../../data/supabase'

type Mode = 'signin' | 'signup'

/** Email + password sign-in / sign-up. Web build only. */
export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null); setNotice(null)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
        // AuthGate picks up the new session via onAuthChange
      } else {
        const ready = await signUp(email.trim(), password)
        if (!ready) setNotice('Check your email for a confirmation link, then sign in.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black text-ink">HabEx</h1>
          <p className="text-sm text-ink-soft">Habits, streaks and money — in one place.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-xl bg-surface p-5 shadow">
          <div className="flex rounded-lg bg-well-strong p-0.5 text-sm">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setNotice(null) }}
                className={`flex-1 rounded-md py-1.5 ${mode === m ? 'bg-surface text-accent shadow-sm' : 'text-ink-soft'}`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <div>
            <label className={label}>Email</label>
            <input className={field} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className={label}>Password</label>
            <input
              className={field}
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {mode === 'signup' && <p className="mt-1 text-xs text-ink-faint">At least 6 characters.</p>}
          </div>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          {notice && <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent">{notice}</p>}

          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-50">
            {mode === 'signin' ? <LuLogIn /> : <LuUserPlus />}
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-faint">Your data is private to your account.</p>
      </div>
    </div>
  )
}
