/**
 * Inactivity reminder: one local notification scheduled 12 h after the app
 * was last used. Every open / foreground / background event re-schedules it,
 * so it only ever fires if the user really has been away that long.
 */
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const KEY = 'reminder'
const ID = 1001
export const INACTIVITY_HOURS = 12

const MESSAGES = [
  "You haven't tracked your progress today. A quick check-in keeps the streak alive.",
  'Your habits are waiting — tick one off and keep the momentum.',
  'Log today before it slips away. It only takes a minute.',
]

export function isReminderEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Ask for permission (Android 13+) and persist the choice. */
export async function setReminderEnabled(on: boolean): Promise<{ ok: boolean; message?: string }> {
  if (!on) {
    try { localStorage.setItem(KEY, '0') } catch { /* ignore */ }
    await cancel()
    return { ok: true }
  }
  if (Capacitor.getPlatform() === 'web') {
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    return { ok: true, message: 'Reminders only fire in the Android app.' }
  }
  const perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') return { ok: false, message: 'Notification permission was not granted.' }
  try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
  await reschedule()
  return { ok: true }
}

async function cancel(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ID }] })
  } catch { /* nothing pending */ }
}

/** Push the reminder out to now + 12 h. Call on every open/resume/pause. */
export async function reschedule(): Promise<void> {
  if (!isReminderEnabled() || Capacitor.getPlatform() === 'web') return
  await cancel()
  const at = new Date(Date.now() + INACTIVITY_HOURS * 60 * 60 * 1000)
  const body = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
  await LocalNotifications.schedule({
    notifications: [{
      id: ID,
      title: 'HabEx',
      body,
      schedule: { at, allowWhileIdle: true },
      smallIcon: 'ic_stat_habex',
    }],
  })
}
