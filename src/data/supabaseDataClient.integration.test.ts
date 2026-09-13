/**
 * Live integration test against the real Supabase project. Skipped unless
 * RUN_INTEGRATION=1 so `npm test` stays offline and fast:
 *   RUN_INTEGRATION=1 npx vitest run src/data/supabaseDataClient.integration.test.ts
 * Uses a throwaway account and wipes that account's rows first.
 */
import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import { addDays, todayStr } from '../lib/dates'
import { signIn, signUp, supabase } from './supabase'
import { supabaseDataClient as data } from './supabaseDataClient'

const EMAIL = 'habex-test@example.com'
const PASSWORD = 'habex-test-password-123'

describe.skipIf(!process.env.RUN_INTEGRATION)('supabaseDataClient (live)', () => {
  beforeAll(async () => {
    try {
      const ready = await signUp(EMAIL, PASSWORD)
      if (!ready) await signIn(EMAIL, PASSWORD)
    } catch {
      await signIn(EMAIL, PASSWORD)
    }
    await data.init()
    // wipe this user's rows (RLS scopes every delete to the signed-in user)
    for (const t of ['habit_logs', 'budgets', 'expenses', 'habits', 'categories', 'goals']) {
      const { error } = await supabase().from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw new Error(`${t}: ${error.message}`)
    }
    await supabase().from('settings').delete().neq('key', '')
  }, 30_000)

  it('seeds default categories once, ordered needs → wants → savings', async () => {
    await data.ensureDefaultCategories()
    await data.ensureDefaultCategories()
    const cats = await data.getCategories()
    expect(cats).toHaveLength(10)
    expect(cats[0].budget_group).toBe('needs')
    expect(cats[cats.length - 1].budget_group).toBe('savings')
  })

  it('habit lifecycle: add, complete (points/streak), idempotent, undo, delete', async () => {
    const h = await data.addHabit({ name: 'Read', type: 'daily', difficulty: 'easy', schedule: 'daily', science_tag: null })
    expect((await data.getHabits())[0]).toMatchObject({ id: h.id, name: 'Read', active: 1, base_points: 10 })

    const today = todayStr()
    const yesterday = addDays(today, -1)
    const l1 = await data.logHabitComplete(h.id, yesterday)
    expect(l1).toMatchObject({ points_earned: 12, streak_at_time: 1 })
    const l2 = await data.logHabitComplete(h.id, today)
    expect(l2).toMatchObject({ points_earned: 14, streak_at_time: 2 })
    expect((await data.logHabitComplete(h.id, today)).id).toBe(l2.id) // idempotent

    const [status] = await data.getHabitsWithStatus(today)
    expect(status).toMatchObject({ completedToday: true, streak: 2, totalPoints: 26 })
    expect(await data.getTotalPoints()).toBe(26)
    expect(await data.getHabitLogs(h.id, { from: today, to: today })).toHaveLength(1)

    await data.undoHabitComplete(h.id, today)
    expect(await data.getHabitLogs(h.id)).toHaveLength(1)

    await data.updateHabit(h.id, { name: 'Read more', type: 'todo', difficulty: 'hard', schedule: 'daily', science_tag: ' x ' })
    const [u] = await data.getHabits()
    expect(u).toMatchObject({ name: 'Read more', type: 'todo', base_points: 35, schedule: null, science_tag: 'x' })

    await data.logHabitComplete(h.id, today) // todo → archived
    expect(await data.getHabits()).toHaveLength(0)
    expect(await data.getHabits(true)).toHaveLength(1)

    await data.deleteHabit(h.id)
    expect(await data.getAllHabitLogs()).toHaveLength(0) // cascade
  })

  it('expenses: add, month listing with category, recurring copies, totals, edit, delete', async () => {
    const cats = await data.getCategories()
    const rent = cats.find((c) => c.name === 'Rent / housing')!
    const tpl = await data.addExpense({ category_id: rent.id, amount: 45000, spent_on: '2026-06-05', note: ' Rent ', is_recurring: true })
    expect(tpl).toMatchObject({ note: 'Rent', is_recurring: 1, recurring_of: null })

    expect(await data.materializeRecurring('2026-09-13')).toBe(3) // Jul, Aug, Sep
    expect(await data.materializeRecurring('2026-09-13')).toBe(0) // idempotent

    const sep = await data.getExpenses('2026-09')
    expect(sep).toHaveLength(1)
    expect(sep[0]).toMatchObject({ amount: 45000, spent_on: '2026-09-05', category_name: 'Rent / housing', budget_group: 'needs', is_recurring: 1, recurring_of: tpl.id })
    expect(typeof sep[0].amount).toBe('number')

    const groceries = cats.find((c) => c.name === 'Groceries')!
    await data.addExpense({ category_id: groceries.id, amount: 1500.5, spent_on: '2026-09-13', note: null, is_recurring: false })
    const totals = await data.getMonthTotals('2026-09')
    expect(totals.total).toBe(46500.5)
    expect(totals.byCategory.get(rent.id)).toBe(45000)
    expect(await data.getDaySpend('2026-09-13')).toBe(1500.5)

    const hist = await data.getSpendHistory('2026-09', 3)
    expect(hist.get(rent.id)).toEqual([45000, 45000, 45000, 45000])

    expect(await data.getCategoryUsage(rent.id)).toBe(4)
    await expect(data.deleteCategory(rent.id)).rejects.toThrow(/in use/)

    await data.deleteExpense(tpl.id) // copies detach and stay
    const after = await data.getExpenses('2026-09')
    const copy = after.find((e) => e.category_id === rent.id)!
    expect(copy).toMatchObject({ is_recurring: 0, recurring_of: null })
    expect(await data.getExpense(tpl.id)).toBeUndefined()
  })

  it('budgets and income', async () => {
    const [cat] = await data.getCategories()
    await data.setBudget({ category_id: cat.id, month: '2026-09', limit_amount: 12000 })
    await data.setBudget({ category_id: cat.id, month: '2026-09', limit_amount: 13000 }) // upsert
    expect(await data.getBudgets('2026-09')).toEqual(new Map([[cat.id, 13000]]))
    await data.setBudget({ category_id: cat.id, month: '2026-09', limit_amount: 0 }) // remove
    expect((await data.getBudgets('2026-09')).size).toBe(0)

    await data.setBudget({ category_id: cat.id, month: '2026-09', limit_amount: 5000 })
    expect(await data.getPreviousBudgetMonth('2026-10')).toBe('2026-09')
    expect(await data.copyBudgets('2026-09', '2026-10')).toBe(1)
    expect((await data.getBudgets('2026-10')).get(cat.id)).toBe(5000)

    expect(await data.getIncome('2026-09')).toBe(0)
    await data.setIncome('2026-09', 120000)
    await data.setIncome('2026-09', 125000)
    expect(await data.getIncome('2026-09')).toBe(125000)
  })

  it('export matches the SQLite backup shape; restore is refused', async () => {
    const snap = await data.exportData()
    expect(Object.keys(snap).sort()).toEqual(['budgets', 'categories', 'expenses', 'goals', 'habit_logs', 'habits', 'settings'])
    expect(snap.expenses[0]).not.toHaveProperty('user_id')
    expect([0, 1]).toContain(snap.expenses[0].is_recurring)
    await expect(data.importData(snap)).rejects.toThrow(/not available/)
  })

  it('RLS: an anonymous client sees none of these rows', async () => {
    const anon = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
    const { data: rows, error } = await anon.from('expenses').select('id')
    expect(error).toBeNull()
    expect(rows).toEqual([])
  })
})
