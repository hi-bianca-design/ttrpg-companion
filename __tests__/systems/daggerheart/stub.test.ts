import { getSystem, SYSTEMS, visibleSystems } from '@/systems/registry'
import { daggerheart } from '@/systems/daggerheart'
import { daggerheartPickStateSchema } from '@/systems/daggerheart/schemas'
import type { CharacterRecord, GameSystem } from '@/systems/types'

test('daggerheart satisfies GameSystem', () => {
  const s: GameSystem = getSystem('daggerheart')
  expect(s.stats).toHaveLength(6)
  expect(s.stats.map((x) => x.key)).toEqual(['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'])
  expect(s.stats.every((x) => x.min === -5 && x.max === 8 && x.default === 0)).toBe(true)
  expect(s.resources.map((r) => [r.key, r.kind])).toEqual([
    ['hp', 'slots'], ['stress', 'slots'], ['armor', 'slots'], ['hope', 'pool'],
  ])
  expect(Object.keys(s.contentKinds)).toEqual(['ancestry', 'community', 'class', 'subclass', 'domain_card'])
  expect(s.contentKinds.subclass.parentKind).toBe('class')
  expect(s.builder.steps).toEqual([])
})

test('hidden from pickers but still resolvable', () => {
  expect(daggerheart.hidden).toBe(true)
  expect(SYSTEMS).toContain(daggerheart)
  expect(visibleSystems().map((s) => s.id)).toEqual(['dnd5e-2024'])
})

const row = {
  system_id: 'daggerheart', name: 'Wren', level: 1,
  stats: { agility: 2, strength: -1, finesse: 1, instinct: 0, presence: 1, knowledge: 0 },
  resources: {
    hp: { tiers: { '1': { max: 6, used: 1 } } },
    stress: { tiers: { '1': { max: 6, used: 0 } } },
    armor: { tiers: { '1': { max: 3, used: 0 } } },
    hope: { current: 2, max: 6 },
  },
  conditions: [], details: { evasion: 10, experiences: ['Wilderness guide +2'] },
}

test('sample character fits the generic row shape', () => {
  expect(daggerheart.schemas.stats.parse(row.stats)).toEqual(row.stats)
  expect(daggerheart.schemas.resources.parse(row.resources)).toEqual(row.resources)
  expect(daggerheart.schemas.details.parse(row.details)).toEqual(row.details)
})

test('rules are inert', () => {
  const c = { id: 'x', ...row } as CharacterRecord
  expect(daggerheart.rules.derived(c, [])).toEqual([])
  expect(daggerheart.rules.rest(c, 'long', [])).toEqual(c.resources)
})

test('sample domain card fits content.data', () => {
  const data = { domain: 'Sage', level: 1, recall_cost: 1, type: 'spell', text: '…' }
  expect(daggerheart.contentKinds.domain_card.schema.parse(data)).toEqual(data)
})

test('loadout/vault fits character_picks.state', () => {
  expect(daggerheartPickStateSchema.parse({ location: 'loadout' })).toEqual({ location: 'loadout' })
  expect(daggerheartPickStateSchema.parse({ location: 'vault' })).toEqual({ location: 'vault' })
  expect(() => daggerheartPickStateSchema.parse({ location: 'nowhere' })).toThrow()
})
