import { levelUp, SUBCLASS_LEVEL } from '@/systems/dnd5e-2024/rules'
import { getSystem } from '@/systems/registry'
import type { CharacterRecord, PickRecord, PoolValue, SlotsValue } from '@/systems/types'

function classPick(name: string, hitDie: number): PickRecord {
  return { content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1, content: { name, data: { hit_die: hitDie } } }
}

function wizard(level: number, slots: SlotsValue, con = 14): CharacterRecord {
  return {
    id: 'c1', system_id: 'dnd5e-2024', name: 'Ada', level,
    stats: { strength: 8, dexterity: 14, constitution: con, intelligence: 16, wisdom: 12, charisma: 10 },
    resources: {
      hp: { current: 10, max: 20, temp: 0 },
      hit_dice: { current: 3, max: level },
      spell_slots: slots,
    },
    conditions: [], details: {},
  }
}

const lvl4Slots: SlotsValue = { tiers: { '1': { max: 4, used: 3 }, '2': { max: 3, used: 1 } } }
const picks = [classPick('Wizard', 6)]

describe('dnd5e levelUp', () => {
  it('is exposed on the system rules', () => {
    expect(getSystem('dnd5e-2024').rules.levelUp).toBe(levelUp)
  })

  it('Wizard 4→5 average with CON +2 adds 6 HP and a tier-3 slot pair; used preserved', () => {
    const next = levelUp(wizard(4, lvl4Slots), picks, { hpMethod: 'average' })
    expect(next.level).toBe(5)
    const hp = next.resources.hp as PoolValue
    expect(hp).toMatchObject({ max: 26, current: 16 }) // d6 avg 4 + 2
    expect((next.resources.hit_dice as PoolValue).max).toBe(5)
    const slots = next.resources.spell_slots as SlotsValue
    expect(slots.tiers['3']).toEqual({ max: 2, used: 0 })
    expect(slots.tiers['1']).toEqual({ max: 4, used: 3 })
    expect(slots.tiers['2']).toEqual({ max: 3, used: 1 })
  })

  it('roll uses the provided roll plus CON mod', () => {
    const next = levelUp(wizard(4, lvl4Slots), picks, { hpMethod: 'roll', roll: 5 })
    expect((next.resources.hp as PoolValue).max).toBe(27)
  })

  it('gain is at least 1 with a heavy CON penalty', () => {
    const next = levelUp(wizard(4, lvl4Slots, 3), picks, { hpMethod: 'roll', roll: 1 })
    expect((next.resources.hp as PoolValue)).toMatchObject({ max: 21, current: 11 })
  })

  it('caps used at the new max when slots shrink (Warlock pact slot level change)', () => {
    const c = wizard(4, { tiers: { '2': { max: 2, used: 2 } } })
    const next = levelUp(c, [classPick('Warlock', 8)], { hpMethod: 'average' })
    const slots = next.resources.spell_slots as SlotsValue
    expect(slots.tiers['3']).toEqual({ max: 2, used: 0 })
    expect(slots.tiers['2']).toBeUndefined()
  })

  it('does not add spell_slots for a non-caster', () => {
    const c = wizard(1, { tiers: {} })
    delete (c.resources as Record<string, unknown>).spell_slots
    const next = levelUp(c, [classPick('Fighter', 10)], { hpMethod: 'average' })
    expect(next.resources.spell_slots).toBeUndefined()
    expect(next.level).toBe(2)
  })

  it('throws at level 20', () => {
    expect(() => levelUp(wizard(20, lvl4Slots), picks, { hpMethod: 'average' })).toThrow(/max level/i)
  })

  it('exposes the default subclass level', () => expect(SUBCLASS_LEVEL).toBe(3))
})
