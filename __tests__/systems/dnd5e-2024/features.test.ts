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

  test('Rage: 2 uses, rising to 6 at level 17; a short rest regains one', () => {
    const rage = (level: number) => featureResources('Barbarian', level, stats).rage.tiers['1'].max
    expect([1, 3, 6, 12, 17].map(rage)).toEqual([2, 3, 4, 5, 6])
    const barb = { ...fighter, content: { name: 'Barbarian', data: { hit_die: 12 } } } as PickRecord
    const c = character({ rage: { tiers: { '1': { max: 2, used: 2 } } } })
    expect(rest(c, 'short', [barb]).rage).toEqual({ tiers: { '1': { max: 2, used: 1 } } })
  })

  test('Bardic Inspiration: Charisma modifier (minimum 1) uses; short rests only help from level 5', () => {
    const uses = (cha: number) => featureResources('Bard', 1, { ...stats, charisma: cha }).bardic_inspiration.tiers['1'].max
    expect([8, 10, 16, 20].map(uses)).toEqual([1, 1, 3, 5])
    const bard = { ...fighter, content: { name: 'Bard', data: { hit_die: 8 } } } as PickRecord
    const spent = { bardic_inspiration: { tiers: { '1': { max: 3, used: 3 } } } }
    expect(rest(character(spent, 4), 'short', [bard]).bardic_inspiration).toEqual({ tiers: { '1': { max: 3, used: 3 } } })
    expect(rest(character(spent, 5), 'short', [bard]).bardic_inspiration).toEqual({ tiers: { '1': { max: 3, used: 0 } } })
    expect(rest(character(spent, 4), 'long', [bard]).bardic_inspiration).toEqual({ tiers: { '1': { max: 3, used: 0 } } })
  })

  test('Innate Sorcery: 2 uses, regained on a long rest only', () => {
    expect(featureResources('Sorcerer', 1, stats).innate_sorcery.tiers['1'].max).toBe(2)
    const sorc = { ...fighter, content: { name: 'Sorcerer', data: { hit_die: 6 } } } as PickRecord
    const spent = { innate_sorcery: { tiers: { '1': { max: 2, used: 2 } } } }
    expect(rest(character(spent), 'short', [sorc]).innate_sorcery).toEqual({ tiers: { '1': { max: 2, used: 2 } } })
    expect(rest(character(spent), 'long', [sorc]).innate_sorcery).toEqual({ tiers: { '1': { max: 2, used: 0 } } })
  })

  test('Favored Enemy: free Hunter\'s Mark casts, 2 at level 1 rising to 6, regained on a long rest', () => {
    const casts = (level: number) => featureResources('Ranger', level, stats).favored_enemy.tiers['1'].max
    expect([1, 5, 9, 13, 17].map(casts)).toEqual([2, 3, 4, 5, 6])
    const ranger = { ...fighter, content: { name: 'Ranger', data: { hit_die: 10 } } } as PickRecord
    const spent = { favored_enemy: { tiers: { '1': { max: 2, used: 2 } } } }
    expect(rest(character(spent), 'short', [ranger]).favored_enemy).toEqual({ tiers: { '1': { max: 2, used: 2 } } })
    expect(rest(character(spent), 'long', [ranger]).favored_enemy).toEqual({ tiers: { '1': { max: 2, used: 0 } } })
  })
})
