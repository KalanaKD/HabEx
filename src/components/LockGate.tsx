import { useCallback, useEffect, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { LuLock } from 'react-icons/lu'
import { authenticate, isLockEnabled, RELOCK_AFTER_MS } from '../lib/appLock'

/**
 * Renders children only once the user has authenticated (when the lock is
 * enabled). Locks again after the app has been in the background for a while.
 */
export default function LockGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(isLockEnabled)
  const [message, setMessage] = useState<string | null>(null)
  const busy = useRef(false)
  const hiddenAt = useRef<number | null>(null)

  const tryUnlock = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setMessage(null)
    const res = await authenticate()
    busy.current = false
    if (res.ok) setLocked(false)
    else setMessage(res.message ?? 'Authentication failed')
  }, [])

  // Prompt as soon as we're locked (launch, or after returning from background).
  useEffect(() => {
    if (locked) void tryUnlock()
  }, [locked, tryUnlock])

  // Background / foreground tracking. The biometric prompt itself can briefly
  // pause the activity, so `busy` guards against re-locking mid-prompt.
  useEffect(() => {
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isLockEnabled() || busy.current) return
      if (!isActive) {
        hiddenAt.current = Date.now()
      } else if (hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER_MS) {
        hiddenAt.current = null
        setLocked(true)
      }
    })
    return () => { void sub.then((h) => h.remove()) }
  }, [])

  if (!locked) return <>{children}</>

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-3xl text-accent"><LuLock /></div>
      <div>
        <h1 className="text-2xl font-bold text-ink">HabEx</h1>
        <p className="text-sm text-ink-soft">Locked</p>
      </div>
      {message && <p className="text-sm text-red-600 dark:text-red-300">{message}</p>}
      <button onClick={tryUnlock} className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white">Unlock</button>
    </div>
  )
}
