import { Capacitor } from '@capacitor/core'
import type { DataClient } from './DataClient'
import { sqliteDataClient } from './sqliteDataClient'
import { supabaseDataClient } from './supabaseDataClient'

export type { DataClient } from './DataClient'

/** True when running inside the Capacitor shell (the Android APK). */
export const isNative = Capacitor.isNativePlatform()

/**
 * The one place the app obtains its data client.
 *  - Android APK   → on-device SQLite (unchanged behaviour)
 *  - plain browser → Supabase (web build, one account per user)
 * Decided once at module load; the platform can't change at runtime.
 */
export function getDataClient(): DataClient {
  return isNative ? sqliteDataClient : supabaseDataClient
}
