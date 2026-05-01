import {
  getAbilityModifier,
  getProficiencyBonus,
  formatModifier,
  getMaxHP,
  SPELLCASTING_CLASSES,
} from '@/modules/character/character.utils'

describe('getAbilityModifier', () => {
  it.each([
    [1, -5], [8, -1], [9, -1], [10, 0], [11, 0],
    [12, 1], [13, 1], [14, 2], [20, 5], [30, 10],
  ])('score %i → modifier %i', (score, expected) => {
    expect(getAbilityModifier(score)).toBe(expected)
  })
})

describe('getProficiencyBonus', () => {
  it.each([
    [1, 2], [4, 2], [5, 3], [8, 3], [9, 4],
    [12, 4], [13, 5], [16, 5], [17, 6], [20, 6],
  ])('level %i → bonus %i', (level, expected) => {
    expect(getProficiencyBonus(level)).toBe(expected)
  })
})

describe('formatModifier', () => {
  it('positive gets + prefix', () => expect(formatModifier(3)).toBe('+3'))
  it('zero gets + prefix', () => expect(formatModifier(0)).toBe('+0'))
  it('negative has no prefix', () => expect(formatModifier(-2)).toBe('-2'))
})

describe('getMaxHP', () => {
  it('level 1 fighter d10 +2 con → 12', () => expect(getMaxHP(1, 10, 2)).toBe(12))
  it('level 1 wizard d6 +0 con → 6', () => expect(getMaxHP(1, 6, 0)).toBe(6))
  // Level 2 cleric d8 +1 con: (8+1) + (4+1+1) = 15
  it('level 2 cleric d8 +1 con → 15', () => expect(getMaxHP(2, 8, 1)).toBe(15))
  // Level 5 wizard d6 +0: 6 + 4*(3+1+0) = 22
  it('level 5 wizard d6 +0 con → 22', () => expect(getMaxHP(5, 6, 0)).toBe(22))
})

describe('SPELLCASTING_CLASSES', () => {
  it('includes casters', () => {
    ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'].forEach((c) =>
      expect(SPELLCASTING_CLASSES).toContain(c)
    )
  })
  it('excludes non-casters', () => {
    expect(SPELLCASTING_CLASSES).not.toContain('Fighter')
    expect(SPELLCASTING_CLASSES).not.toContain('Barbarian')
  })
})
