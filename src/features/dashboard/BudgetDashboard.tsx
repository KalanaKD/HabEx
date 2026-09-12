import { GROUP_STYLE } from '../../components/ui'
import { formatMoney } from '../../lib/money'
import type { BudgetRow } from '../budgets/useBudgets'
import { allocationSlices, groupPlan } from './budgetStats'
import { Card, CategoryPie, Empty } from './chartParts'

/** Plan-side view of a month's budget: fed by useBudgets, no extra queries. */
export default function BudgetDashboard({ rows, income }: { rows: BudgetRow[]; income: number }) {
  const stats = rows.map((r) => ({ category: r.category, spent: r.spent, limit: r.limit }))
  const slices = allocationSlices(stats, income)
  const { plans, basis, denominator } = groupPlan(stats, income)
  const allocated = plans.reduce((s, p) => s + p.allocated, 0)

  return (
    <div className="space-y-3">
      <Card title="Where the income goes" subtitle={income > 0 ? `income ${formatMoney(income)}` : `allocated ${formatMoney(allocated)}`}>
        {slices.length === 0 ? <Empty text="No allocations yet — set limits in the list view." /> : <CategoryPie slices={slices} />}
      </Card>

      <Card title="Plan vs 50 / 30 / 20" subtitle={denominator > 0 ? `of ${basis} ${formatMoney(denominator)}` : undefined}>
        {denominator === 0 ? <Empty text="Enter income or allocations first." /> : (
          <ul className="space-y-3">
            {plans.map((p) => {
              const off = Math.round((p.share - p.target) * 100)
              return (
                <li key={p.group}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${GROUP_STYLE[p.group]}`}>{p.group}</span>
                    <span className="text-ink-muted">
                      <span className="font-semibold text-ink">{Math.round(p.share * 100)}%</span>
                      <span className="text-ink-faint"> / {Math.round(p.target * 100)}% target</span>
                      <span className={`ml-2 text-xs ${off === 0 ? 'text-emerald-600' : 'text-ink-faint'}`}>{off === 0 ? 'on target' : `${off > 0 ? '+' : ''}${off} pts`}</span>
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-well">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, p.share * 100)}%` }} />
                    <div className="absolute top-[-3px] h-[14px] w-0.5 bg-ink" style={{ left: `${p.target * 100}%` }} aria-hidden />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card title="Allocated vs spent by group">
        {allocated === 0 ? <Empty text="No allocations yet." /> : (
          <ul className="space-y-3">
            {plans.map((p) => {
              const pct = p.allocated > 0 ? Math.min(100, (p.spent / p.allocated) * 100) : 0
              const over = p.allocated > 0 && p.spent > p.allocated
              return (
                <li key={p.group}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${GROUP_STYLE[p.group]}`}>{p.group}</span>
                    <span className="text-ink-muted">
                      <span className={`font-semibold ${over ? 'text-red-600' : 'text-ink'}`}>{formatMoney(p.spent)}</span>
                      <span className="text-ink-faint"> of {formatMoney(p.allocated)}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-well">
                    <div className={`h-full rounded-full ${over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
