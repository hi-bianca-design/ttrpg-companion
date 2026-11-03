import { classChoicesFor, sameName } from '@/systems/dnd5e-2024/classChoices'

describe('classChoicesFor', () => {
  test('Fighter: a Fighting Style and three weapon masteries', () => {
    const choices = classChoicesFor('Fighter', ['Fighting Style', 'Second Wind', 'Weapon Mastery'])
    expect(choices.map((c) => c.key)).toEqual(['fighting_style', 'weapon_mastery'])
    expect(choices.map((c) => c.count)).toEqual([1, 3])
    expect(choices.map((c) => c.label)).toEqual(['Fighting Style', 'Weapon Mastery'])
    choices.forEach((c) => expect(c.help.length).toBeGreaterThan(0))
  })

  test('Rogue: two expertise skills and two weapon masteries', () => {
    const choices = classChoicesFor('Rogue', ['Expertise', 'Sneak Attack', 'Weapon Mastery'])
    expect(choices.find((c) => c.key === 'expertise')).toMatchObject({ count: 2, label: 'Expertise' })
    expect(choices.find((c) => c.key === 'weapon_mastery')).toMatchObject({ count: 2 })
  })

  test('Wizard has none', () => {
    expect(classChoicesFor('Wizard', ['Spellcasting', 'Ritual Adept', 'Arcane Recovery'])).toEqual([])
  })

  test('Cleric and Druid choose an order', () => {
    expect(classChoicesFor('Cleric', ['Spellcasting', 'Divine Order'])).toEqual([
      expect.objectContaining({ key: 'order', label: 'Divine Order', count: 1 }),
    ])
    expect(classChoicesFor('Druid', ['Spellcasting', 'Druidic', 'Primal Order'])).toEqual([
      expect.objectContaining({ key: 'order', label: 'Primal Order', count: 1 }),
    ])
  })
})

describe('sameName', () => {
  test('trimmed, case-insensitive string equality', () => {
    expect(sameName(' Defense ', 'defense')).toBe(true)
    expect(sameName('Defense', 'Dueling')).toBe(false)
  })
  test('false for non-strings', () => {
    expect(sameName(undefined, 'x')).toBe(false)
    expect(sameName('x', null)).toBe(false)
    expect(sameName(1, 1)).toBe(false)
  })
})
