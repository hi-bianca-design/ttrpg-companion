import { holdsTurn } from '@/features/sessions/turn'

const holding = { in_combat: true, current_turn_user_id: 'p1' }

test('the holder, viewing their own character, holds the turn', () => {
  expect(holdsTurn(holding, 'p1', 'p1')).toBe(true)
})

test('a holder viewing a teammate’s character does not', () => {
  expect(holdsTurn(holding, 'p1', 'p2')).toBe(false)
})

test('the GM viewing the holder’s sheet does not', () => {
  expect(holdsTurn(holding, 'gm1', 'p1')).toBe(false)
})

test('outside combat nobody holds a turn', () => {
  expect(holdsTurn({ in_combat: false, current_turn_user_id: 'p1' }, 'p1', 'p1')).toBe(false)
})

test('with nobody holding the turn nobody does, and unknown ids never match each other', () => {
  expect(holdsTurn({ in_combat: true, current_turn_user_id: null }, 'p1', 'p1')).toBe(false)
  expect(holdsTurn({ in_combat: true, current_turn_user_id: null }, undefined, undefined)).toBe(false)
  expect(holdsTurn(holding, undefined, 'p1')).toBe(false)
  expect(holdsTurn(holding, 'p1', undefined)).toBe(false)
})
