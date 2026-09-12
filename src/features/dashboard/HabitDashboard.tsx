import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LuFlame, LuTrophy } from 'react-icons/lu'
import { parseDateStr } from '../../lib/dates'
import type { HeatmapCell, WeekCompletion } from './habitStats'
import { useHabitStats } from './useHabitStats'

export default function HabitDashboard() {
  const { stats, error } = useHabitStats()

  if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
  if (!stats) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <div className="space-y-3">
      <LevelWidget {...stats} />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Best streak" value={stats.bestStreak} unit="days" icon={<LuFlame className="text-orange-500" />} />
        <StatTile label="Last 7 days" value={stats.last7Pct ?? '—'} unit={stats.last7Pct === null ? '' : '%'} />
      </div>
      <Card title="Completions — last 12 weeks">
        <StreakHeatmap columns={stats.heatmap} />
      </Card>
      <Card title="Weekly completion %">
        <WeeklyChart data={stats.weekly} />
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
  )
}

function StatTile({ label, value, unit, icon }: { label: string; value: number | string; unit: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="flex items-center gap-1 text-xs text-slate-500">{icon}{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">
        {value} <span className="text-sm font-normal text-slate-500">{unit}</span>
      </div>
    </div>
  )
}

function LevelWidget({ level, totalPoints, levelProgress, pointsToNext }: {
  level: number; totalPoints: number; levelProgress: number; pointsToNext: number
}) {
  return (
    <section className="rounded-xl bg-indigo-600 p-4 text-white shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LuTrophy className="text-2xl text-amber-300" />
          <div>
            <div className="text-xs uppercase tracking-wide text-indigo-200">Level</div>
            <div className="text-3xl font-bold leading-none">{level}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">{totalPoints.toLocaleString()}</div>
          <div className="text-xs text-indigo-200">total XP</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-900/40">
        <div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.round(levelProgress * 100)}%` }} />
      </div>
      <div className="mt-1 text-xs text-indigo-200">{pointsToNext} XP to level {level + 1}</div>
    </section>
  )
}

// Sequential ramp: one hue, light → dark. Index = HeatmapCell.level.
const HEAT = ['bg-slate-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-600', 'bg-indigo-800']
const DAY_LABELS = ['M', '', 'W', '', 'F', '', '']

function StreakHeatmap({ columns }: { columns: HeatmapCell[][] }) {
  const [selected, setSelected] = useState<HeatmapCell | null>(null)
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto">
        <div className="grid shrink-0 grid-rows-7 gap-1 pr-1 text-[10px] leading-3 text-slate-400">
          {DAY_LABELS.map((l, i) => <span key={i} className="h-3">{l}</span>)}
        </div>
        {columns.map((col, i) => (
          <div key={i} className="grid shrink-0 grid-rows-7 gap-1">
            {col.map((cell) => (
              <button
                key={cell.date}
                aria-label={`${cell.date}: ${cell.count} completions`}
                onClick={() => setSelected(selected?.date === cell.date ? null : cell)}
                className={`h-3 w-3 rounded-sm ${HEAT[cell.level]} ${selected?.date === cell.date ? 'ring-2 ring-slate-800 ring-offset-1' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{selected ? `${fmt(selected.date)} · ${selected.count} completion${selected.count === 1 ? '' : 's'}` : 'Tap a day for details'}</span>
        <span className="flex items-center gap-1">
          less {HEAT.map((c) => <span key={c} className={`h-2.5 w-2.5 rounded-sm ${c}`} />)} more
        </span>
      </div>
    </div>
  )
}

function WeeklyChart({ data }: { data: WeekCompletion[] }) {
  if (data.every((d) => d.pct === null)) {
    return <p className="text-sm text-slate-400">No scheduled habits yet.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap={2}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} />
        <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: '#f1f5f9' }} content={<WeekTooltip />} />
        <Bar dataKey="pct" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function WeekTooltip({ active, payload }: { active?: boolean; payload?: { payload: WeekCompletion }[] }) {
  const w = payload?.[0]?.payload
  if (!active || !w) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow">
      <div className="font-medium text-slate-700">Week of {w.label}</div>
      <div className="text-slate-500">{w.pct === null ? 'Nothing scheduled' : `${w.pct}% · ${w.completed} of ${w.expected}`}</div>
    </div>
  )
}

function fmt(d: string): string {
  return parseDateStr(d).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
}
