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
