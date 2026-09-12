import { CATEGORY_COLORS, OTHER_COLOR, type PieSlice } from './expenseStats'

// Recharts' default tooltip is styled inline (white); point it at our tokens.
export const TOOLTIP_STYLE = {
  contentStyle: { background: 'var(--color-surface)', border: '1px solid var(--color-edge)', borderRadius: 8, color: 'var(--color-ink)', fontSize: 12 },
  itemStyle: { color: 'var(--color-ink)' },
  labelStyle: { color: 'var(--color-ink-soft)' },
}

export const colorOf = (s: PieSlice) =>
  s.colorIndex === -2 ? 'var(--color-well-strong)' : s.colorIndex < 0 ? OTHER_COLOR : CATEGORY_COLORS[s.colorIndex]
