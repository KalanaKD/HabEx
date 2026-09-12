import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatMoney } from '../../lib/money'
import { colorOf, TOOLTIP_STYLE } from './chartTheme'
import type { PieSlice } from './expenseStats'

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-surface p-4 shadow">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink-2">{title}</h2>
        {subtitle && <span className="text-xs text-ink-soft">{subtitle}</span>}
      </div>
      {children}
    </section>
  )
}

export function Empty({ text = 'No expenses this month.' }: { text?: string }) {
  return <p className="text-sm text-ink-faint">{text}</p>
}

export function CategoryPie({ slices }: { slices: PieSlice[] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64} paddingAngle={2}>
              {slices.map((s) => <Cell key={s.name} fill={colorOf(s)} stroke="var(--color-surface)" strokeWidth={2} />)}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v))} {...TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Visible legend with values: identity is never colour-alone */}
      <ul className="min-w-0 flex-1 space-y-1 text-xs">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorOf(s) }} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{s.name}</span>
            <span className="text-ink-soft">{Math.round(s.pct * 100)}%</span>
            <span className="w-20 text-right font-medium text-ink">{formatMoney(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
