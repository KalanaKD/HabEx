import { describe, expect, it } from 'vitest'
import { overspendCheck, unassigned } from './overspend'

describe('overspendCheck', () => {
  it('flags when current exceeds 1.3x the trailing average', () => {
    expect(overspendCheck(140, [100, 100, 100])).toMatchObject({ flagged: true, average: 100, ratio: 1.4 })
  })
  it('does not flag at exactly 1.3x or below', () => {
    expect(overspendCheck(130, [100, 100, 100]).flagged).toBe(false)
    expect(overspendCheck(50, [100, 100, 100]).flagged).toBe(false)
  })
  it('treats months with no spend as zero in the average', () => {
    // avg = (300 + 0 + 0) / 3 = 100
    expect(overspendCheck(131, [300, 0, 0])).toMatchObject({ flagged: true, average: 100 })
  })
  it('never flags with no history or an all-zero history', () => {
    expect(overspendCheck(500, [])).toMatchObject({ flagged: false, ratio: null })
    expect(overspendCheck(500, [0, 0, 0])).toMatchObject({ flagged: false, ratio: null })
  })
})

describe('unassigned', () => {
  it('is income minus all allocations', () => {
    expect(unassigned(1000, [400, 300, 300])).toBe(0)
    expect(unassigned(1000, [400, 300])).toBe(300)
    expect(unassigned(1000, [600, 600])).toBe(-200)
    expect(unassigned(0, [])).toBe(0)
  })
})
