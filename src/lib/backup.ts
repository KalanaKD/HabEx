/**
 * Backup = one JSON file with every table plus user preferences.
 * Restore replaces all data atomically after validating the file.
 */
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { getDataClient } from '../data'
import { getThemePref, setThemePref, type ThemePref } from './theme'

export const BACKUP_VERSION = 1

export interface BackupFile {
  app: 'habex'
  version: number
  exportedAt: string
  tables: Record<string, Record<string, unknown>[]>
  prefs: { theme: ThemePref; reminder: boolean }
}

export async function buildBackup(): Promise<BackupFile> {
  const data = getDataClient()
  await data.init()
  const tables = await data.exportData()
  let reminder = false
  try { reminder = localStorage.getItem('reminder') === '1' } catch { /* ignore */ }
  return { app: 'habex', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables, prefs: { theme: getThemePref(), reminder } }
}

export function backupFileName(when = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `habex-backup-${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())}_${p(when.getHours())}${p(when.getMinutes())}.json`
}

export interface ExportResult {
  fileName: string
  /** Native file URI (for Share); undefined on web where a download is triggered. */
  uri?: string
  /** Human-readable location. */
  location: string
}

/** Write the backup: Documents/HabEx/ on Android, a download in the browser. */
export async function exportBackup(): Promise<ExportResult> {
  const json = JSON.stringify(await buildBackup(), null, 2)
  const fileName = backupFileName()
  if (Capacitor.getPlatform() === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName })
    a.click()
    URL.revokeObjectURL(url)
    rememberBackup()
    return { fileName, location: 'Browser downloads' }
  }
  const res = await Filesystem.writeFile({
    path: `HabEx/${fileName}`,
    data: json,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  })
  rememberBackup()
  return { fileName, uri: res.uri, location: 'Documents/HabEx' }
}

export async function shareBackup(uri: string, fileName: string): Promise<void> {
  await Share.share({ title: fileName, files: [uri] })
}

function rememberBackup() {
  try { localStorage.setItem('lastBackup', new Date().toISOString()) } catch { /* ignore */ }
}

export function lastBackupAt(): string | null {
  try { return localStorage.getItem('lastBackup') } catch { return null }
}

/** Throws a readable error if the text isn't a HabEx backup we can restore. */
export function parseBackup(text: string): BackupFile {
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new Error('Not a valid JSON file.') }
  const b = data as Partial<BackupFile>
  if (b?.app !== 'habex' || typeof b.version !== 'number' || typeof b.tables !== 'object' || !b.tables) {
    throw new Error('This file is not a HabEx backup.')
  }
  if (b.version > BACKUP_VERSION) throw new Error(`Backup version ${b.version} is newer than this app supports.`)
  for (const [name, rows] of Object.entries(b.tables)) {
    if (!Array.isArray(rows)) throw new Error(`Table "${name}" is malformed.`)
  }
  return b as BackupFile
}

/** Summary shown in the confirm step so the user knows what they're restoring. */
export function describeBackup(b: BackupFile): string {
  const n = (t: string) => b.tables[t]?.length ?? 0
  const when = new Date(b.exportedAt)
  return `${n('habits')} habits, ${n('habit_logs')} completions, ${n('expenses')} expenses, ${n('categories')} categories · exported ${isNaN(when.getTime()) ? 'unknown date' : when.toLocaleString()}`
}

/** Replace ALL current data with the backup, in one transaction. */
export async function restoreBackup(b: BackupFile): Promise<void> {
  const data = getDataClient()
  await data.init()
  await data.importData(b.tables)
  if (b.prefs?.theme) setThemePref(b.prefs.theme)
  try { localStorage.setItem('reminder', b.prefs?.reminder ? '1' : '0') } catch { /* ignore */ }
}
