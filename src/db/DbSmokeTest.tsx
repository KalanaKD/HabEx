import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { initDb, newId, query, run } from './db'

type HabitRow = { id: string; name: string; difficulty: string; created_at: string }

/**
 * Temporary screen for build-order step 2: proves the DB opens, the schema
 * exists, and INSERT / SELECT / DELETE round-trip on both web and Android.
 * Replaced by the real habit UI in step 3.
 */
export default function DbSmokeTest() {
  const [status, setStatus] = useState('Opening database…')
  const [tables, setTables] = useState<string[]>([])
  const [habits, setHabits] = useState<HabitRow[]>([])

  async function refresh() {
    setHabits(await query<HabitRow>('SELECT id, name, difficulty, created_at FROM habits ORDER BY created_at DESC'))
  }

  useEffect(() => {
    initDb()
      .then(async () => {
        const rows = await query<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        setTables(rows.map((r) => r.name))
        await refresh()
        setStatus(`Ready (${Capacitor.getPlatform()} backend)`)
      })
      .catch((e: unknown) => setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`))
  }, [])

  async function addTestHabit() {
    await run(
      'INSERT INTO habits (id, name, type, difficulty, base_points, schedule, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newId(), `Test habit ${habits.length + 1}`, 'habit', 'easy', 10, 'daily', new Date().toISOString()],
    )
    await refresh()
  }

  async function deleteHabit(id: string) {
    await run('DELETE FROM habits WHERE id = ?', [id])
    await refresh()
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">DB smoke test</h1>
        <p className="text-sm text-slate-500">{status}</p>

        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-2 font-semibold text-slate-700">Tables ({tables.length})</h2>
          <ul className="flex flex-wrap gap-2">
            {tables.map((t) => (
              <li key={t} className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">{t}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-white p-4 shadow">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Habits ({habits.length})</h2>
            <button
              onClick={addTestHabit}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white active:bg-indigo-700"
            >
              + Insert test row
            </button>
          </div>
          {habits.length === 0 ? (
            <p className="text-sm text-slate-400">No rows yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {habits.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">{h.name} <span className="text-slate-400">({h.difficulty})</span></span>
                  <button onClick={() => deleteHabit(h.id)} className="text-red-500 hover:underline">delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
