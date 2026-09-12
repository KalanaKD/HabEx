/** Single-currency app: change the symbol here if needed. */
export const CURRENCY = 'Rs.'

export function formatMoney(amount: number, opts: { compact?: boolean } = {}): string {
  const n = opts.compact && Math.abs(amount) >= 100_000
    ? `${(amount / 1000).toFixed(0)}k`
    : amount.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return `${CURRENCY} ${n}`
}

/** Parse user input like "1,250.50" → 1250.5; NaN if invalid. */
export function parseMoney(input: string): number {
  return Number(input.replace(/[^0-9.-]/g, ''))
}
