import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GROUP_STYLE } from '../../components/ui'
import { formatMoney } from '../../lib/money'
import { Card, CategoryPie, Empty } from './chartParts'
import { TOOLTIP_STYLE } from './chartTheme'
import { budgetVsActual, groupRatios, pieData, type CategorySpend } from './expenseStats'
import { useExpenseStats } from './useExpenseStats'

export default function ExpenseDashboard({ month }: { month: string }) {
  const { rows, income, error } = useExpenseStats(month)
  if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
  if (!rows) return <p className="text-sm text-ink-faint">Loading…</p>

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
                    <span className="text-ink-muted">
                      <span className={`font-semibold ${over && r.group !== 'savings' ? 'text-red-600' : 'text-ink'}`}>{Math.round(r.actual * 100)}%</span>
                      <span className="text-ink-faint"> / {Math.round(r.target * 100)}% target · {formatMoney(r.spent)}</span>
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-well">
                    <div className={`h-full rounded-full ${over && r.group !== 'savings' ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, r.actual * 100)}%` }} />
                    {/* target marker */}
                    <div className="absolute top-[-3px] h-[14px] w-0.5 bg-ink" style={{ left: `${r.target * 100}%` }} aria-hidden />
                  </div>
                </li>
              )
            })}
            <li className="text-xs text-ink-faint">Black tick = target. Under target is fine for needs and wants; over is fine for savings.</li>
          </ul>
        )}
      </Card>
    </div>
  )
}

function BudgetBars({ rows }: { rows: CategorySpend[] }) {
  const data = rows.map((r) => ({ name: r.category.name, Limit: r.limit, Spent: r.spent }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 44 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap={8} barGap={2}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => formatMoney(Number(v))} cursor={{ fill: 'var(--color-well)' }} {...TOOLTIP_STYLE} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--color-ink-soft)' }} />
        <Bar dataKey="Limit" fill="#cbd5e1" radius={[0, 4, 4, 0]} maxBarSize={12} />
        <Bar dataKey="Spent" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  )
}
