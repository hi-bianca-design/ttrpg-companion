import { SPELLCASTING_ABILITY, spellSaveDCs } from '@/systems/dnd5e-2024/rules'
import type { CharacterRecord, PickRecord } from '@/systems/types'

function cls(name: string, data: unknown = {}): PickRecord {
  return { content_id: name, kind: 'class', state: {}, acquired_at_level: 1, content: { name, data } }
}

function char(level: number, stats: Record<string, number>): CharacterRecord {
  return { id: 'c1', system_id: 'dnd5e-2024', name: 'Mira', level, stats, resources: {}, conditions: [], details: {} }
}

describe('spellSaveDCs', () => {
  it('a level 1 Wizard with Intelligence 16 has DC 13', () => {
    expect(spellSaveDCs(char(1, { intelligence: 16 }), [cls('Wizard')])).toEqual([
      { className: 'Wizard', ability: 'intelligence', dc: 13 },
    ])
  })

  it('uses the proficiency bonus of the character level', () => {
    expect(spellSaveDCs(char(5, { intelligence: 16 }), [cls('Wizard')])[0].dc).toBe(14)
  })

  it('a Cleric uses Wisdom, not Intelligence', () => {
    expect(spellSaveDCs(char(1, { intelligence: 18, wisdom: 12 }), [cls('Cleric')])).toEqual([
      { className: 'Cleric', ability: 'wisdom', dc: 11 },
    ])
  })

  it('maps all eight casting classes to their ability', () => {
    expect(SPELLCASTING_ABILITY).toEqual({
      bard: 'charisma', paladin: 'charisma', sorcerer: 'charisma', warlock: 'charisma',
      cleric: 'wisdom', druid: 'wisdom', ranger: 'wisdom', wizard: 'intelligence',
    })
  })

  it.each(['Fighter', 'Barbarian', 'Monk', 'Rogue'])('%s has no DC', (name) => {
    expect(spellSaveDCs(char(5, { strength: 16, wisdom: 16 }), [cls(name)])).toEqual([])
  })

  it('has no DC without a class pick', () => {
    expect(spellSaveDCs(char(1, {}), [])).toEqual([])
  })

  it('a homebrew class with a spellcasting ability uses it', () => {
    expect(spellSaveDCs(char(1, { charisma: 14 }), [cls('Mystic', { spellcasting_ability: 'charisma' })])).toEqual([
      { className: 'Mystic', ability: 'charisma', dc: 12 },
    ])
  })

  it('a homebrew class without an ability has no DC', () => {
    expect(spellSaveDCs(char(1, { charisma: 14 }), [cls('Mystic', {})])).toEqual([])
  })

  it('ignores an invalid homebrew ability', () => {
    expect(spellSaveDCs(char(1, {}), [cls('Mystic', { spellcasting_ability: 'luck' })])).toEqual([])
  })

  it('returns one entry per class pick, in pick order, using total level', () => {
    const result = spellSaveDCs(char(5, { intelligence: 16, wisdom: 14 }), [cls('Wizard'), cls('Cleric')])
    expect(result).toEqual([
      { className: 'Wizard', ability: 'intelligence', dc: 14 },
      { className: 'Cleric', ability: 'wisdom', dc: 13 },
    ])
  })

  it('counts a missing ability score as 10', () => {
    expect(spellSaveDCs(char(1, {}), [cls('Wizard')])[0].dc).toBe(10)
  })

  it('matches class names case-insensitively', () => {
    expect(spellSaveDCs(char(1, { intelligence: 10 }), [cls('WIZARD')])).toHaveLength(1)
  })
})
