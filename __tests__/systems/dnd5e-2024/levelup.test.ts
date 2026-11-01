import { ASI_LEVELS, hpGain, isAsiLevel, levelUp, SUBCLASS_LEVEL } from '@/systems/dnd5e-2024/rules'
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

describe('invalid roll', () => {
  it('hpGain never returns NaN: falls back to the average', () => {
    expect(hpGain(6, 2, { hpMethod: 'roll', roll: NaN })).toBe(6)
    expect(hpGain(6, 2, { hpMethod: 'roll', roll: 99 })).toBe(6)
    expect(hpGain(6, 2, { hpMethod: 'roll' })).toBe(6)
  })

  it('levelUp with a NaN roll yields a finite hp max', () => {
    const next = levelUp(wizard(4, lvl4Slots), picks, { hpMethod: 'roll', roll: NaN })
    expect((next.resources.hp as PoolValue).max).toBe(26)
  })
})

describe('Ability Score Improvement', () => {
  const fighter = [classPick('Fighter', 10)]

  it('is due at levels 4, 8, 12, 16 and 19 only', () => {
    expect(ASI_LEVELS).toEqual([4, 8, 12, 16, 19])
    expect([...Array(20)].map((_, i) => i + 1).filter(isAsiLevel)).toEqual([4, 8, 12, 16, 19])
  })

  it('+2 to one ability on reaching level 4', () => {
    const next = levelUp(wizard(3, lvl4Slots), fighter, { hpMethod: 'average', asi: { strength: 2 } })
    expect(next.level).toBe(4)
    expect(next.stats).toEqual({ ...wizard(3, lvl4Slots).stats, strength: 10 })
  })

  it('+1 to two abilities', () => {
    const next = levelUp(wizard(7, lvl4Slots), fighter, { hpMethod: 'average', asi: { dexterity: 1, wisdom: 1 } })
    expect(next.stats).toMatchObject({ dexterity: 15, wisdom: 13, strength: 8 })
  })

  it('never raises a score above 20', () => {
    const c = { ...wizard(18, lvl4Slots), stats: { ...wizard(18, lvl4Slots).stats, intelligence: 19 } }
    expect(levelUp(c, fighter, { hpMethod: 'average', asi: { intelligence: 2 } }).stats.intelligence).toBe(20)
  })

  it('is ignored at a level without an ASI, and stats are returned unchanged', () => {
    const c = wizard(4, lvl4Slots)
    const next = levelUp(c, fighter, { hpMethod: 'average', asi: { strength: 2 } })
    expect(next.level).toBe(5)
    expect(next.stats).toEqual(c.stats)
  })

  it('ignores an ASI that is not exactly 2 points', () => {
    const c = wizard(3, lvl4Slots)
    expect(levelUp(c, fighter, { hpMethod: 'average', asi: { strength: 2, dexterity: 1 } }).stats).toEqual(c.stats)
    expect(levelUp(c, fighter, { hpMethod: 'average', asi: { strength: 1 } }).stats).toEqual(c.stats)
  })

  it('a higher CON modifier raises max HP for every level, as if it had always applied', () => {
    // CON 13 (+1) -> 15 (+2) at level 4: this level gains 6 (d10 avg) + 2, plus 1 for each of the 3 earlier levels.
    const c = { ...wizard(3, lvl4Slots, 13), resources: { hp: { current: 20, max: 28, temp: 0 } } }
    const next = levelUp(c, fighter, { hpMethod: 'average', asi: { constitution: 2 } })
    expect(next.stats.constitution).toBe(15)
    expect(next.resources.hp).toMatchObject({ max: 28 + 8 + 3, current: 20 + 8 + 3 })
  })
})
