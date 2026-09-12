import { describe, expect, it } from 'vitest'
import { levelFromPoints, pointsEarned, pointsForLevel, streakBonus } from './points'

describe('streakBonus', () => {
  it('is 2 per streak day', () => {
    expect(streakBonus(0)).toBe(0)
    expect(streakBonus(1)).toBe(2)
    expect(streakBonus(7)).toBe(14)
  })
  it('caps at 30', () => {
    expect(streakBonus(15)).toBe(30)
    expect(streakBonus(100)).toBe(30)
  })
})

describe('pointsEarned', () => {
  it('adds base points and streak bonus', () => {
    expect(pointsEarned('trivial', 1)).toBe(5 + 2)
    expect(pointsEarned('easy', 3)).toBe(10 + 6)
    expect(pointsEarned('medium', 0)).toBe(20)
    expect(pointsEarned('hard', 50)).toBe(35 + 30)
  })
})

describe('levelFromPoints', () => {
  it('follows floor(sqrt(points / 100))', () => {
    expect(levelFromPoints(0)).toBe(0)
    expect(levelFromPoints(99)).toBe(0)
    expect(levelFromPoints(100)).toBe(1)
    expect(levelFromPoints(399)).toBe(1)
    expect(levelFromPoints(400)).toBe(2)
    expect(levelFromPoints(2500)).toBe(5)
  })
  it('is the inverse of pointsForLevel', () => {
    for (let l = 0; l < 20; l++) expect(levelFromPoints(pointsForLevel(l))).toBe(l)
  })
})
