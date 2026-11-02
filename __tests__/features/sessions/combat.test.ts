import { canEndCombat } from '@/features/sessions/combat'

test('the GM can end combat', () => {
  expect(canEndCombat({ combat_started_by: 'p1' }, 'gm1', 'gm1')).toBe(true)
})

test('whoever started combat can end it', () => {
  expect(canEndCombat({ combat_started_by: 'p1' }, 'p1', 'gm1')).toBe(true)
})

test('another member cannot end combat', () => {
  expect(canEndCombat({ combat_started_by: 'p1' }, 'p2', 'gm1')).toBe(false)
})

test('unknown ids never match each other', () => {
  expect(canEndCombat({ combat_started_by: null }, undefined, undefined)).toBe(false)
  expect(canEndCombat({ combat_started_by: null }, 'p2', undefined)).toBe(false)
  expect(canEndCombat({ combat_started_by: 'p1' }, undefined, 'gm1')).toBe(false)
})
