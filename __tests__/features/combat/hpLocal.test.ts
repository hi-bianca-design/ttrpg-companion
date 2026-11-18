import { applyHpLocal } from '@/features/combat/hpLocal'
import { enemy, entry } from '../../helpers/combat'

// The same cases as the server's apply_enemy_hp tests: the offline copy must land on the same numbers.
const one = (over: Parameters<typeof enemy>[0]) => [enemy({ max_hp: 30, hp: 22, temp_hp: 0, ...over })]
const hpOf = (rows: ReturnType<typeof applyHpLocal>, id = 'g1') => {
  const r = rows.find((e) => e.id === id)!
  return { hp: r.hp, max: r.max_hp, temp: r.temp_hp }
}

test('22/30 minus 7 is 15/30', () => {
  expect(hpOf(applyHpLocal(one({ id: 'g1' }), ['g1'], 'damage', 7))).toEqual({ hp: 15, max: 30, temp: 0 })
})

test('20 damage on 15/30 floors at 0/30', () => {
  expect(hpOf(applyHpLocal(one({ id: 'g1', hp: 15 }), ['g1'], 'damage', 20))).toEqual({ hp: 0, max: 30, temp: 0 })
})

test('damage takes temp first: 5 temp and 12 HP, 7 damage leaves 0 temp and 10 HP', () => {
  expect(hpOf(applyHpLocal(one({ id: 'g1', hp: 12, temp_hp: 5 }), ['g1'], 'damage', 7))).toEqual({ hp: 10, max: 30, temp: 0 })
})

test('heal caps at max and never raises temp', () => {
  expect(hpOf(applyHpLocal(one({ id: 'g1', hp: 25, temp_hp: 3 }), ['g1'], 'heal', 10))).toEqual({ hp: 30, max: 30, temp: 3 })
})

test('temp keeps the larger value and leaves HP alone', () => {
  expect(hpOf(applyHpLocal(one({ id: 'g1', temp_hp: 6 }), ['g1'], 'temp', 4))).toEqual({ hp: 22, max: 30, temp: 6 })
  expect(hpOf(applyHpLocal(one({ id: 'g1', temp_hp: 2 }), ['g1'], 'temp', 4))).toEqual({ hp: 22, max: 30, temp: 4 })
})

test('only the listed enemies change; players and other rows are untouched', () => {
  const rows = [
    enemy({ id: 'g1', hp: 7, max_hp: 7 }),
    enemy({ id: 'g2', hp: 7, max_hp: 7 }),
    entry({ id: 'p1', kind: 'player' }),
  ]
  const out = applyHpLocal(rows, ['g1', 'p1'], 'damage', 3)
  expect(out.map((e) => e.hp)).toEqual([4, 7, null])
  expect(out[1]).toBe(rows[1])
  expect(out[2]).toBe(rows[2])
})

test('an amount below 1 changes nothing (the server refuses it)', () => {
  const rows = one({ id: 'g1' })
  expect(applyHpLocal(rows, ['g1'], 'damage', 0)).toEqual(rows)
})
