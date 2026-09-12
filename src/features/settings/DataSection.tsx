import { useRef, useState } from 'react'
import { LuDownload, LuShare2, LuUpload } from 'react-icons/lu'
import { toast } from '../../components/toast'
import { describeBackup, exportBackup, lastBackupAt, parseBackup, restoreBackup, shareBackup, type BackupFile, type ExportResult } from '../../lib/backup'

/** Backup / restore controls for the Settings screen. */
export default function DataSection({ onRestored }: { onRestored: () => void }) {
  const [last, setLast] = useState(lastBackupAt)
  const [exported, setExported] = useState<ExportResult | null>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function doExport() {
    setBusy(true); setError(null)
    try {
      const res = await exportBackup()
      setExported(res)
      setLast(lastBackupAt())
      toast(`Saved to ${res.location}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    setError(null)
    try {
      setPending(parseBackup(await file.text()))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function doRestore() {
    if (!pending) return
    setBusy(true); setError(null)
    try {
      await restoreBackup(pending)
      setPending(null)
      toast('Backup restored')
      onRestored()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const btn = 'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium disabled:opacity-50'

  return (
    <section className="rounded-xl bg-surface p-4 shadow">
      <h2 className="mb-1 text-sm font-semibold text-ink-2">Data</h2>
      <p className="mb-3 text-xs text-ink-soft">
        Everything lives only on this device. {last ? `Last backup ${new Date(last).toLocaleString()}.` : 'No backup yet.'}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={doExport} disabled={busy} className={`${btn} bg-indigo-600 text-white`}>
          <LuDownload /> Export backup
        </button>
        <button onClick={() => fileInput.current?.click()} disabled={busy} className={`${btn} border border-edge-strong text-ink-muted`}>
          <LuUpload /> Restore…
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" onChange={onPick} className="hidden" />
      </div>

      {exported?.uri && (
        <button onClick={() => shareBackup(exported.uri!, exported.fileName)} className={`${btn} mt-2 w-full bg-well text-ink-2`}>
          <LuShare2 /> Share {exported.fileName}
        </button>
      )}

      {pending && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          <p className="font-medium text-amber-800 dark:text-amber-200">Replace all current data?</p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{describeBackup(pending)}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={doRestore} disabled={busy} className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white">Restore</button>
            <button onClick={() => setPending(null)} className="px-2 text-xs text-ink-soft">Cancel</button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
    </section>
  )
}
