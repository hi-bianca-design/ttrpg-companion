import { dnd5e2024 } from '@/systems/dnd5e-2024'
import { getSystem } from '@/systems/registry'
import type { CharacterRecord, PickRecord } from '@/systems/types'

const summary = dnd5e2024.rules.partySummary!

function character(over: Partial<CharacterRecord> = {}): CharacterRecord {
  return {
    id: 'c1', system_id: 'dnd5e-2024', name: 'Mira', level: 5,
    stats: { strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 12, charisma: 10 },
    resources: { hp: { current: 20, max: 30, temp: 0 } },
    conditions: [], details: {}, ...over,
  }
}

function pick(kind: string, name: string, data: unknown): PickRecord {
  return { content_id: `${kind}-${name}`, kind, state: {}, acquired_at_level: 1, content: { name, data } }
}

const species = (traits: { name: string; description: string }[], speed = 30) =>
  pick('species', 'Test', { speed, traits: { traits } })

const labels = (items: { key: string; label: string; value: string }[]) => Object.fromEntries(items.map((i) => [i.key, i.value]))

test('the D&D system provides a party summary', () => {
  expect(typeof getSystem('dnd5e-2024').rules.partySummary).toBe('function')
})

test('glance shows AC, passive perception and speed', () => {
  const { glance } = summary(character(), [species([], 35)])
  expect(glance.map((g) => g.key)).toEqual(['ac', 'passive_perception', 'speed'])
  expect(labels(glance)).toEqual({ ac: '12', passive_perception: '11', speed: '35' })
})

test('more shows passive insight and investigation', () => {
  const { more } = summary(character(), [])
  expect(labels(more)).toMatchObject({ passive_insight: '11', passive_investigation: '10' })
})

test('darkvision appears only when a species trait names it, with its range', () => {
  const none = summary(character(), [species([{ name: 'Brave', description: 'Advantage against fear.' }])])
  expect(none.more.find((m) => m.key === 'darkvision')).toBeUndefined()
  const sixty = summary(character(), [species([{ name: 'Darkvision', description: 'You have Darkvision with a range of 60 feet.' }])])
  expect(labels(sixty.more).darkvision).toBe('60 ft')
  const oneTwenty = summary(character(), [species([{ name: 'Darkvision', description: 'You have Darkvision with a range of 120 feet.' }])])
  expect(labels(oneTwenty.more).darkvision).toBe('120 ft')
})

test('no species pick means no darkvision and no crash', () => {
  expect(() => summary(character(), [])).not.toThrow()
  expect(summary(character(), []).more.find((m) => m.key === 'darkvision')).toBeUndefined()
})

test('inspiration shows only when set', () => {
  expect(summary(character(), []).more.find((m) => m.key === 'inspiration')).toBeUndefined()
  expect(labels(summary(character({ details: { inspiration: true } }), []).more).inspiration).toBe('Inspired')
})
