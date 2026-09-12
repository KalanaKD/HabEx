/**
 * Database layer.
 *
 * One SQLite database, two backends:
 *  - Native (Android APK): @capacitor-community/sqlite talks to the real
 *    SQLite library bundled with Android. Writes hit disk immediately.
 *  - Web (npm run dev in a browser): the same plugin API, but backed by
 *    <jeep-sqlite>, a web component running SQLite compiled to WebAssembly.
 *    The DB lives in memory and is flushed to IndexedDB by saveToStore().
 *
 * Every other module should go through initDb()/query()/run() and never
 * touch the plugin directly, so the rest of the app doesn't care which
 * backend is active.
 */
import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader'
// Vite's `?raw` suffix imports the file's contents as a plain string.
import schemaSql from './schema.sql?raw'

const DB_NAME = 'habit_expense'
const isWeb = Capacitor.getPlatform() === 'web'

const sqlite = new SQLiteConnection(CapacitorSQLite)
let db: SQLiteDBConnection | null = null
// Cached promise so concurrent callers (e.g. React StrictMode double-running
// effects in dev) share one initialization instead of racing.
let initPromise: Promise<SQLiteDBConnection> | null = null

/** Open (or create) the database and make sure the schema exists. */
export function initDb(): Promise<SQLiteDBConnection> {
  if (!initPromise) initPromise = doInit()
  return initPromise
}

async function doInit(): Promise<SQLiteDBConnection> {
  if (isWeb) {
    // Register the <jeep-sqlite> custom element and mount one instance.
    // The plugin's web implementation looks for it in the DOM.
    defineJeepSqlite(window)
    const el = document.createElement('jeep-sqlite')
    el.wasmPath = '/assets' // where public/assets/sql-wasm.wasm is served from
    document.body.appendChild(el)
    await customElements.whenDefined('jeep-sqlite')
    await sqlite.initWebStore()
  }

  // The plugin keeps a registry of open connections. If a hot-reload left one
  // open, reuse it; otherwise create a fresh one.
  const consistency = await sqlite.checkConnectionsConsistency()
  const alreadyOpen = (await sqlite.isConnection(DB_NAME, false)).result
  const conn =
    consistency.result && alreadyOpen
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)

  await conn.open()
  await conn.execute(schemaSql)
  if (isWeb) await sqlite.saveToStore(DB_NAME)

  db = conn
  return conn
}

function requireDb(): SQLiteDBConnection {
  if (!db) throw new Error('Database not initialized — call initDb() first')
  return db
}

/** Run a SELECT and get typed rows back. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await requireDb().query(sql, params)
  return (result.values ?? []) as T[]
}

/** Run an INSERT / UPDATE / DELETE. Returns the number of affected rows. */
export async function run(sql: string, params: unknown[] = []): Promise<number> {
  const result = await requireDb().run(sql, params)
  // On web the change only lives in memory until we flush it to IndexedDB.
  if (isWeb) await sqlite.saveToStore(DB_NAME)
  return result.changes?.changes ?? 0
}

/** Generate a primary key. All tables use TEXT ids (UUIDs). */
export function newId(): string {
  return crypto.randomUUID()
}
