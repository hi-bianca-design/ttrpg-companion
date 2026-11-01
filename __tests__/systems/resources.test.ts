import { adjustPool, restoreSlot, setTemp, spendSlot } from '@/systems/resources'

test('spendSlot caps at max', () => expect(spendSlot({ tiers: { '1': { max: 2, used: 2 } } }, '1').tiers['1'].used).toBe(2))
test('restoreSlot floors at 0', () => expect(restoreSlot({ tiers: { '1': { max: 2, used: 0 } } }, '1').tiers['1'].used).toBe(0))
test('two spends apply twice', () => expect(spendSlot(spendSlot({ tiers: { '1': { max: 4, used: 0 } } }, '1'), '1').tiers['1'].used).toBe(2))
test('damage eats temp first', () => expect(adjustPool({ current: 10, max: 20, temp: 5 }, -8)).toEqual({ current: 7, max: 20, temp: 0 }))
test('healing caps at max', () => expect(adjustPool({ current: 18, max: 20 }, 5).current).toBe(20))
test('hp never negative', () => expect(adjustPool({ current: 3, max: 20 }, -50).current).toBe(0))

test('spendSlot does not mutate its input', () => {
  const v = { tiers: { '1': { max: 2, used: 0 } } }
  spendSlot(v, '1')
  expect(v.tiers['1'].used).toBe(0)
})
test('spendSlot on an unknown tier is a no-op', () => {
  const v = { tiers: { '1': { max: 2, used: 0 } } }
  expect(spendSlot(v, '9')).toEqual(v)
})
test('damage smaller than temp leaves current untouched', () =>
  expect(adjustPool({ current: 10, max: 20, temp: 5 }, -3)).toEqual({ current: 10, max: 20, temp: 2 }))
test('setTemp does not stack: keeps the larger value', () => {
  expect(setTemp({ current: 10, max: 20, temp: 5 }, 3).temp).toBe(5)
  expect(setTemp({ current: 10, max: 20, temp: 5 }, 8).temp).toBe(8)
})
test('setTemp floors at 0', () => expect(setTemp({ current: 10, max: 20 }, -4).temp).toBe(0))

// ── applyPoolChange: reviving clears the system's showWhenEmpty trackers ──
import { applyPoolChange } from '@/systems/resources'
import type { ResourceDef } from '@/systems/types'

const DEFS: ResourceDef[] = [
  { key: 'life', label: 'Life', kind: 'pool', display: 'bar' },
  { key: 'downA', label: 'A', kind: 'slots', display: 'pips', count: 'marked', showWhenEmpty: 'life' },
  { key: 'downB', label: 'B', kind: 'slots', display: 'pips', count: 'marked', showWhenEmpty: 'life' },
  { key: 'other', label: 'O', kind: 'slots', display: 'pips' },
]
const marked = (used: number) => ({ tiers: { '1': { max: 3, used } } })
const base = (current: number) => ({ life: { current, max: 10 }, downA: marked(2), downB: marked(1), other: marked(1) })

test('healing from 0 to above 0 clears every showWhenEmpty tracker of that pool, in the same result', () => {
  const next = applyPoolChange(base(0), DEFS, 'life', (p) => adjustPool(p, 4))
  expect(next.life).toEqual({ current: 4, max: 10 })
  expect(next.downA).toEqual(marked(0))
  expect(next.downB).toEqual(marked(0))
  expect(next.other).toEqual(marked(1))
})

test('changes that do not revive leave the trackers alone', () => {
  expect(applyPoolChange(base(5), DEFS, 'life', (p) => adjustPool(p, 2)).downA).toEqual(marked(2))
  expect(applyPoolChange(base(0), DEFS, 'life', (p) => adjustPool(p, -2)).downA).toEqual(marked(2))
})

test('an unknown pool key is a no-op', () => {
  const r = base(0)
  expect(applyPoolChange(r, DEFS, 'nope', (p) => adjustPool(p, 4))).toBe(r)
})
