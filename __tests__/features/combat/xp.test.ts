import { buildGmOrder, type GmEnemyRow } from '@/features/combat/battleOrder'
import { xpEarned } from '@/features/combat/xp'
import { combat, enemy } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))

const rows = (entries: ReturnType<typeof enemy>[]) =>
  buildGmOrder({ combat: combat(), entries, party: [], userId: 'gm' }).rows as GmEnemyRow[]

test('counts the xp of downed enemies only', () => {
  expect(xpEarned(rows([
    enemy({ id: 'a', hp: 0, xp: 200 }),
    enemy({ id: 'b', hp: 0, xp: 50 }),
    enemy({ id: 'c', hp: 7, xp: 200 }),
  ]))).toBe(250)
})

test('a downed enemy with no xp counts as 0', () => {
  expect(xpEarned(rows([enemy({ id: 'a', hp: 0, xp: null }), enemy({ id: 'b', hp: 0, xp: 50 })]))).toBe(50)
})

test('healing a downed enemy above 0 takes its xp back out of the total', () => {
  const down = rows([enemy({ id: 'a', hp: 0, xp: 200 }), enemy({ id: 'b', hp: 0, xp: 50 })])
  expect(xpEarned(down)).toBe(250)
  const healed = rows([enemy({ id: 'a', hp: 3, xp: 200 }), enemy({ id: 'b', hp: 0, xp: 50 })])
  expect(healed[0].isDown).toBe(false)
  expect(xpEarned(healed)).toBe(50)
})

test('no enemies earn nothing', () => {
  expect(xpEarned([])).toBe(0)
})
