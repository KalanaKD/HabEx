import type { DataClient } from './DataClient'
import { sqliteDataClient } from './sqliteDataClient'

export type { DataClient } from './DataClient'

/**
 * The one place the app obtains its data client. Always SQLite for now;
 * migration step 4 adds the platform switch (native → SQLite, web → Supabase).
 */
export function getDataClient(): DataClient {
  return sqliteDataClient
}
