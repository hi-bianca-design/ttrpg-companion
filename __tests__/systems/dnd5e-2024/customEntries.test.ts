import {
  cachedClassFields,
  cleanName,
  collidesWithOfficial,
  customData,
  customExtraFields,
  type CustomEntry,
} from '@/systems/dnd5e-2024/customEntries'
import { dnd5eContentSchemas } from '@/systems/dnd5e-2024/schemas'

const KINDS = ['class', 'species', 'background'] as const

describe('customData', () => {
  it.each(KINDS)('%s with empty extras parses and carries one_off', (kind) => {
    const data = customData(kind, {}, true)
    expect(dnd5eContentSchemas[kind].safeParse(data).success).toBe(true)
    expect((data as { one_off?: boolean }).one_off).toBe(true)
  })

  it('class defaults', () => {
    expect(customData('class', {}, true)).toEqual({
      one_off: true, hit_die: 8, primary_abilities: [], saving_throw_proficiencies: [], features: {},
    })
  })

  it('species defaults', () => {
    expect(customData('species', {}, true)).toEqual({
      one_off: true, speed: 30, size: 'Medium', creature_type: 'Humanoid', traits: {}, ability_score_bonuses: {},
    })
  })

  it('background defaults', () => {
    expect(customData('background', {}, true)).toEqual({
      one_off: true, skill_proficiencies: [], ability_score_options: {},
    })
  })

  it('class converts string hit die, clamps skills, omits one_off', () => {
    const data = customData('class', { hit_die: '10', skill_count: 5, skill_from: ['stealth', 'arcana'] }, false) as any
    expect(data.hit_die).toBe(10)
    expect(data.features.skill_choices).toEqual({ count: 2, from: ['stealth', 'arcana'] })
    expect('one_off' in data).toBe(false)
    expect(dnd5eContentSchemas.class.safeParse(data).success).toBe(true)
  })

  it('class is defensive about bad extras', () => {
    const data = customData('class', { hit_die: 'abc', skill_count: '2', skill_from: ['stealth', 'bogus'] }, false) as any
    expect(data.hit_die).toBe(8)
    expect(data.features.skill_choices).toEqual({ count: 1, from: ['stealth'] })
    const none = customData('class', { skill_count: 3, skill_from: ['bogus'] }, false) as any
    expect(none.features.skill_choices).toBeUndefined()
    expect(() => customData('class', { skill_from: 'x', primary_abilities: 4 }, false)).not.toThrow()
  })

  it('species uses extras and falls back for bad ones', () => {
    const data = customData('species', { speed: '35', size: 'Small', creature_type: 'Fey' }, false) as any
    expect(data).toMatchObject({ speed: 35, size: 'Small', creature_type: 'Fey' })
    const bad = customData('species', { speed: 'fast', creature_type: '  ' }, false) as any
    expect(bad).toMatchObject({ speed: 30, creature_type: 'Humanoid' })
  })

  it('background keeps known skills and optional text', () => {
    const data = customData('background', { skill_proficiencies: ['stealth', 'nope'], origin_feat: 'Alert' }, false) as any
    expect(data.skill_proficiencies).toEqual(['stealth'])
    expect(data.origin_feat).toBe('Alert')
    expect(dnd5eContentSchemas.background.safeParse(data).success).toBe(true)
  })
})

describe('cachedClassFields', () => {
  const entry = (extras: Record<string, unknown>): CustomEntry =>
    ({ name: '  My   Class ', description: '', library: false, extras })

  it('defaults', () => {
    expect(cachedClassFields(entry({}))).toEqual({
      class_name: 'My Class', hit_die: 8, class_skill_count: 0,
      class_skill_options: [], class_features: [], class_equipment_options: [],
    })
  })

  it('uses clamped count and skill keys', () => {
    const f = cachedClassFields(entry({ hit_die: '12', skill_count: '4', skill_from: ['arcana', 'x', 'stealth'] }))
    expect(f).toMatchObject({ hit_die: 12, class_skill_count: 2, class_skill_options: ['arcana', 'stealth'] })
  })
})

describe('helpers', () => {
  it('collidesWithOfficial', () => {
    expect(collidesWithOfficial(' fighter ', ['Fighter'])).toBe(true)
    expect(collidesWithOfficial('Bard', ['Fighter'])).toBe(false)
  })
  it('cleanName', () => {
    expect(cleanName('  A   B  ')).toBe('A B')
    expect(cleanName('x'.repeat(100))).toHaveLength(80)
  })
  it('customExtraFields', () => {
    expect(customExtraFields('class').map((f) => f.key)).toEqual(
      expect.arrayContaining(['hit_die', 'skill_count', 'skill_from']),
    )
    expect(customExtraFields('species').every((f) => !f.required)).toBe(true)
    expect(customExtraFields('class').find((f) => f.key === 'skill_from')!.options).toHaveLength(18)
  })
})

describe('homebrew spellcasting ability', () => {
  const parse = (data: unknown) => dnd5eContentSchemas.class.safeParse(data).success

  it('is kept when it is a valid ability', () => {
    const data = customData('class', { spellcasting_ability: 'wisdom' }, false) as Record<string, unknown>
    expect(data.spellcasting_ability).toBe('wisdom')
    expect(parse(data)).toBe(true)
  })

  it.each(['', undefined, 'luck'])('is omitted for %p', (v) => {
    const data = customData('class', { spellcasting_ability: v }, false) as Record<string, unknown>
    expect('spellcasting_ability' in data).toBe(false)
    expect(parse(data)).toBe(true)
  })

  it('has an optional class form field', () => {
    const field = customExtraFields('class').find((f) => f.key === 'spellcasting_ability')
    expect(field).toMatchObject({ type: 'select', required: false })
    expect(field?.options).toContain('intelligence')
  })
})
