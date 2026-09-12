import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GROUP_STYLE } from '../../components/ui'
import { formatMoney } from '../../lib/money'
import { CATEGORY_COLORS, OTHER_COLOR, budgetVsActual, groupRatios, pieData, type CategorySpend, type PieSlice } from './expenseStats'
import { useExpenseStats } from './useExpenseStats'

export default function ExpenseDashboard({ month }: { month: string }) {
  const { rows, income, error } = useExpenseStats(month)
  if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
  if (!rows) return <p className="text-sm text-slate-400">Loading…</p>

  const slices = pieData(rows)
  const total = slices.reduce((s, x) => s + x.value, 0)
  const bva = budgetVsActual(rows)
  const { ratios, basis, denominator } = groupRatios(rows, income)

  return (
    <div className="space-y-3">
      <Card title="Spending by category" subtitle={total ? formatMoney(total) : undefined}>
        {slices.length === 0 ? <Empty /> : <CategoryPie slices={slices} />}
      </Card>
      <Card title="Budget vs actual">
        {bva.length === 0 ? <Empty text="Set some limits on the Budgets tab." /> : <BudgetBars rows={bva} />}
      </Card>
      <Card title="Needs / wants / savings vs 50 / 30 / 20"
        subtitle={denominator > 0 ? `of ${basis === 'income' ? 'income' : 'total spend'} ${formatMoney(denominator)}` : undefined}>
        {denominator === 0 ? <Empty /> : (
          <ul className="space-y-3">
            {ratios.map((r) => {
              const over = r.actual > r.target
              return (
                <li key={r.group}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${GROUP_STYLE[r.group]}`}>{r.group}</span>
                    <span className="text-slate-600">
                      <span className={`font-semibold ${over && r.group !== 'savings' ? 'text-red-600' : 'text-slate-800'}`}>{Math.round(r.actual * 100)}%</span>
                      <span className="text-slate-400"> / {Math.round(r.target * 100)}% target · {formatMoney(r.spent)}</span>
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${over && r.group !== 'savings' ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, r.actual * 100)}%` }} />
                    {/* target marker */}
                    <div className="absolute top-[-3px] h-[14px] w-0.5 bg-slate-700" style={{ left: `${r.target * 100}%` }} aria-hidden />
                  </div>
                </li>
              )
            })}
            <li className="text-xs text-slate-400">Black tick = target. Under target is fine for needs and wants; over is fine for savings.</li>
          </ul>
        )}
      </Card>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
      {children}
    </section>
  )
}

function Empty({ text = 'No expenses this month.' }: { text?: string }) {
  return <p className="text-sm text-slate-400">{text}</p>
}

const colorOf = (s: PieSlice) => (s.colorIndex < 0 ? OTHER_COLOR : CATEGORY_COLORS[s.colorIndex])

function CategoryPie({ slices }: { slices: PieSlice[] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64} paddingAngle={2} stroke="#fff" strokeWidth={2}>
              {slices.map((s) => <Cell key={s.name} fill={colorOf(s)} />)}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Visible legend with values: identity is never colour-alone */}
      <ul className="min-w-0 flex-1 space-y-1 text-xs">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorOf(s) }} />
            <span className="min-w-0 flex-1 truncate text-slate-700">{s.name}</span>
            <span className="text-slate-500">{Math.round(s.pct * 100)}%</span>
            <span className="w-20 text-right font-medium text-slate-800">{formatMoney(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BudgetBars({ rows }: { rows: CategorySpend[] }) {
  const data = rows.map((r) => ({ name: r.category.name, Limit: r.limit, Spent: r.spent }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 44 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap={8} barGap={2}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => formatMoney(Number(v))} cursor={{ fill: '#f8fafc' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Limit" fill="#cbd5e1" radius={[0, 4, 4, 0]} maxBarSize={12} />
        <Bar dataKey="Spent" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  )
}
