import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isNative } from '../../data'
import { getSession, onAuthChange } from '../../data/supabase'
import AuthScreen from './AuthScreen'

/**
 * Web build: renders children only with a signed-in Supabase session.
 * Android: no accounts — children render immediately, nothing else runs.
 * Children are keyed by user id so a sign-out/sign-in remounts every hook
 * with a clean state.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(isNative ? null : undefined)

  useEffect(() => {
    if (isNative) return
    let active = true
    void getSession().then((s) => { if (active) setSession(s) })
    const off = onAuthChange((s) => { if (active) setSession(s) })
    return () => { active = false; off() }
  }, [])

  if (isNative) return <>{children}</>
  if (session === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-ink-soft">Loading…</div>
  }
  if (!session) return <AuthScreen />
  return <div key={session.user.id}>{children}</div>
}
