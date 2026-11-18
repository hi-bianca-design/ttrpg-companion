import { nextEntryLocal } from '@/features/combat/turnLocal'

type Row = { id: string; kind: 'player' | 'enemy'; hp: number | null }
const p = (id: string): Row => ({ id, kind: 'player', hp: null })
const e = (id: string, hp = 7): Row => ({ id, kind: 'enemy', hp })

test('moves to the next row', () => {
  expect(nextEntryLocal([p('a'), p('b'), e('g')], 'a')).toEqual({ id: 'b', wrapped: false })
})

test('skips a downed enemy', () => {
  expect(nextEntryLocal([p('a'), e('g', 0), p('b')], 'a')).toEqual({ id: 'b', wrapped: false })
})

test('never skips a player, even one the GM thinks is down (their HP is not in the order)', () => {
  expect(nextEntryLocal([p('a'), { id: 'b', kind: 'player', hp: 0 }, p('c')], 'a')).toEqual({ id: 'b', wrapped: false })
})

test('past the last row it wraps and says so', () => {
  expect(nextEntryLocal([p('a'), p('b'), p('c')], 'c')).toEqual({ id: 'a', wrapped: true })
})

test('a wrap also skips downed enemies at the top', () => {
  expect(nextEntryLocal([e('g', 0), p('a'), p('b')], 'b')).toEqual({ id: 'a', wrapped: true })
})

test('when every other entry is a downed enemy it returns the plain next position', () => {
  expect(nextEntryLocal([p('a'), e('g1', 0), e('g2', 0)], 'a')).toEqual({ id: 'g1', wrapped: false })
})

test('all others downed and current last: the plain next position wraps', () => {
  expect(nextEntryLocal([e('g1', 0), e('g2', 0), p('a')], 'a')).toEqual({ id: 'g1', wrapped: true })
})

test('a single row wraps onto itself', () => {
  expect(nextEntryLocal([p('a')], 'a')).toEqual({ id: 'a', wrapped: true })
})

test('an unknown current starts before the first row', () => {
  expect(nextEntryLocal([e('g', 0), p('a')], 'zzz')).toEqual({ id: 'a', wrapped: false })
})

test('no rows: nothing to move to', () => {
  expect(nextEntryLocal([], 'a')).toBeNull()
})
