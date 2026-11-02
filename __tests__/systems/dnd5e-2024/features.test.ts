import { dnd5eBuilder } from '@/systems/dnd5e-2024/builder'
import { DND_RESOURCES } from '@/systems/dnd5e-2024/definition'
import { featureResources, grownFeatures } from '@/systems/dnd5e-2024/features'
import { dnd5eResourcesSchema } from '@/systems/dnd5e-2024/schemas'
import { levelUp, rest } from '@/systems/dnd5e-2024/rules'
import type { CharacterRecord, PickRecord } from '@/systems/types'

const stats = { strength: 16, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 10, charisma: 10 }
const fighter = { content_id: 'f', kind: 'class', state: {}, acquired_at_level: 1, content: { name: 'Fighter', data: { hit_die: 10 } } } as PickRecord

function character(resources: CharacterRecord['resources'], level = 1): CharacterRecord {
  return {
    id: 'c', system_id: 'dnd5e-2024', name: 'T', level, stats, conditions: [], derived: [], details: {},
    resources: { hp: { current: 5, max: 12 }, hit_dice: { current: 0, max: level }, ...resources },
  } as unknown as CharacterRecord
}

describe('limited-use class features', () => {
  test('uses scale with level; classes without features get none', () => {
    expect(featureResources('Fighter', 1, stats).second_wind.tiers['1'].max).toBe(2)
    expect(featureResources('Fighter', 4, stats).second_wind.tiers['1'].max).toBe(3)
    expect(featureResources('Fighter', 10, stats).second_wind.tiers['1'].max).toBe(4)
    expect(featureResources('Wizard', 1, stats)).toEqual({})
  })

  test('a new Fighter starts with unspent Second Wind; other classes do not get it', () => {
    const draft = { ...dnd5eBuilder.initialDraft(), class_name: 'Fighter', hit_die: 10 }
    expect(dnd5eBuilder.toCharacter(draft).resources.second_wind).toEqual({ tiers: { '1': { max: 2, used: 0 } } })
    expect(dnd5eBuilder.toCharacter({ ...draft, class_name: 'Wizard' }).resources.second_wind).toBeUndefined()
  })

  test('short rest regains one use, long rest all of them', () => {
    const c = character({ second_wind: { tiers: { '1': { max: 2, used: 2 } } } })
    expect(rest(c, 'short', [fighter]).second_wind).toEqual({ tiers: { '1': { max: 2, used: 1 } } })
    expect(rest(c, 'long', [fighter]).second_wind).toEqual({ tiers: { '1': { max: 2, used: 0 } } })
  })

  test('levelling raises the max and keeps spent uses', () => {
    const c = character({ second_wind: { tiers: { '1': { max: 2, used: 1 } } } }, 3)
    const next = levelUp(c, [fighter], { hpMethod: 'average' })
    expect(next.resources.second_wind).toEqual({ tiers: { '1': { max: 3, used: 1 } } })
    expect(grownFeatures({ second_wind: { tiers: { '1': { max: 4, used: 4 } } } }, 'Fighter', 1, stats).second_wind.tiers['1']).toEqual({ max: 2, used: 2 })
  })

  test('feature resources survive the resources schema, and each has a definition', () => {
    const parsed = dnd5eResourcesSchema.parse({ ...character({}).resources, second_wind: { tiers: { '1': { max: 2, used: 0 } } }, death_saves_success: { tiers: {} }, death_saves_failure: { tiers: {} }, spell_slots: { tiers: {} } })
    expect(parsed).toHaveProperty('second_wind')
    expect(DND_RESOURCES.some((d) => d.key === 'second_wind' && d.kind === 'slots' && d.group === 'feature')).toBe(true)
  })
})
