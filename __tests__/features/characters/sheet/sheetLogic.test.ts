import { buildEntries, lowestBlockedLevel } from '@/features/characters/sheet/ActionsList'
import { sortItems } from '@/features/characters/sheet/InventoryList'
import type { PickRecord } from '@/systems/types'
import type { ItemWithContent } from '@/features/characters/characters.api'

const item = (id: string, name: string, created_at: string, equipped = false) =>
  ({ id, created_at, equipped, content: { name } }) as unknown as ItemWithContent

test('sortItems: created_at first, then name; equipping does not move a row', () => {
  const items = [item('c', 'Torch', '2026-01-02'), item('a', 'Rope', '2026-01-01'), item('b', 'Dagger', '2026-01-02')]
  expect(sortItems(items).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  const toggled = items.map((i) => (i.id === 'c' ? { ...i, equipped: true } : i)).reverse()
  expect(sortItems(toggled).map((i) => i.id)).toEqual(['a', 'b', 'c'])
})

test('lowestBlockedLevel: the lowest spell level no remaining slot can pay for', () => {
  const s = (t1: number, t2: number) => ({ tiers: { '1': { max: 2, used: t1 }, '2': { max: 1, used: t2 } } })
  expect(lowestBlockedLevel(s(0, 0))).toBeNull()
  expect(lowestBlockedLevel(s(2, 0))).toBeNull()
  expect(lowestBlockedLevel(s(0, 1))).toBe(2)
  expect(lowestBlockedLevel(s(2, 1))).toBe(1)
  expect(lowestBlockedLevel(undefined)).toBeNull()
})

describe('buildEntries weapon mastery', () => {
  const weapon = (id: string, name: string, mastery: string) => ({
    content_id: id, kind: 'item', state: { equipped: true }, acquired_at_level: 1,
    content: { name, data: { category: 'Martial Melee Weapon', properties: { mastery } } },
  }) as PickRecord
  const klass = (state: Record<string, unknown>) => ({ content_id: 'c', kind: 'class', state, acquired_at_level: 1, content: { name: 'Fighter', data: {} } }) as PickRecord

  test('only mastered weapons show their mastery when the class lists them', () => {
    const entries = buildEntries([klass({ mastery: ['g'] }), weapon('g', 'Greatsword', 'Graze'), weapon('f', 'Flail', 'Sap')])
    expect(entries.map((e) => [e.title, e.meta])).toEqual([['Greatsword', 'Mastery · Graze'], ['Flail', undefined]])
  })

  test('characters without a mastery list still show every weapon property', () => {
    const entries = buildEntries([klass({}), weapon('f', 'Flail', 'Sap')])
    expect(entries[0].meta).toBe('Mastery · Sap')
  })
})
