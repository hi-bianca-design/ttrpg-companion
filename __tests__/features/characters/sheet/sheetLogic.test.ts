import { buildEntries, lowestBlockedLevel } from '@/features/characters/sheet/ActionsList'
import type { PickRecord } from '@/systems/types'
import { sortItems } from '@/features/characters/sheet/InventoryList'
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
  const weapon = (name: string, mastery: string): PickRecord => ({
    content_id: `w-${name}`, kind: 'item', state: { equipped: true }, acquired_at_level: 1,
    content: { name, data: { category: 'Martial Melee Weapon', properties: { damage: '1d8', damage_type: 'Slashing', mastery } } },
  })
  const cls = (state: Record<string, unknown>): PickRecord => ({ content_id: 'ftr', kind: 'class', state, acquired_at_level: 1, content: { name: 'Fighter', data: {} } })
  const metas = (picks: PickRecord[]) => Object.fromEntries(buildEntries(picks).map((e) => [e.title, e.meta]))
  const weapons = [weapon('Longsword', 'Sap'), weapon('Greataxe', 'Cleave')]

  test('only weapons named in the mastery list show their property', () => {
    expect(metas([cls({ choices: { weapon_mastery: ['longsword'] } }), ...weapons])).toEqual({ Longsword: 'Mastery · Sap', Greataxe: undefined })
  })

  test('without a mastery list every weapon shows it', () => {
    expect(metas([cls({}), ...weapons])).toEqual({ Longsword: 'Mastery · Sap', Greataxe: 'Mastery · Cleave' })
    expect(metas([cls({ choices: { weapon_mastery: [] } }), ...weapons])).toEqual({ Longsword: 'Mastery · Sap', Greataxe: 'Mastery · Cleave' })
  })
})
