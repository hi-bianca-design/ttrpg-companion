import { useBuilderStore, visibleSteps } from '@/features/characters/builder/builder.store'
import { getSystem } from '@/systems/registry'

const store = () => useBuilderStore.getState()

beforeEach(() => store().reset())

describe('useBuilderStore', () => {
  test('starts empty, start() picks the system and its initial draft', () => {
    expect(store().systemId).toBeNull()
    store().start('dnd5e-2024')
    expect(store().systemId).toBe('dnd5e-2024')
    expect(store().draft).toEqual(getSystem('dnd5e-2024').builder.initialDraft())
  })

  test('update({class_id: other}) drops spells not on the new class list and resets the subclass, keeping name and stats', () => {
    store().start('dnd5e-2024')
    store().update({
      class_id: 'wiz', class_name: 'Wizard', subclass_id: 'evoker', name: 'Mira', intelligence: 15, strength: 8,
      spell_ids: ['shared', 'wiz-only'],
      spell_classes: { shared: ['wizard', 'sorcerer'], 'wiz-only': ['wizard'] },
    })
    store().update({ class_id: 'sorc', class_name: 'Sorcerer' })
    expect(store().draft).toMatchObject({
      class_id: 'sorc', class_name: 'Sorcerer', subclass_id: null, spell_ids: ['shared'],
      name: 'Mira', intelligence: 15, strength: 8,
    })
  })

  test('update without a started system is a no-op', () => {
    store().update({ name: 'Nobody' })
    expect(store().draft.name).toBeUndefined()
  })

  test('reset clears the system and draft', () => {
    store().start('dnd5e-2024')
    store().update({ name: 'Mira' })
    store().reset()
    expect(store().systemId).toBeNull()
    expect(store().draft).toEqual({})
  })
})

describe('visibleSteps', () => {
  const { builder } = getSystem('dnd5e-2024')

  test('a Fighter sees every step but Spells, in the final order', () => {
    const draft = {
      ...builder.initialDraft(), class_name: 'Fighter', class_skill_count: 2,
      class_features: ['Fighting Style', 'Second Wind', 'Weapon Mastery'],
    }
    const ids = visibleSteps(builder.steps, draft).map((s) => s.id)
    expect(ids).not.toContain('spells')
    expect(ids).toEqual(['class', 'origin', 'skills', 'equipment', 'ability-scores', 'class-features', 'details', 'personality', 'review'])
  })

  test('a Wizard has no Class features step and sees Spells', () => {
    const ids = visibleSteps(builder.steps, { ...builder.initialDraft(), class_name: 'Wizard', class_skill_count: 2, class_features: ['Spellcasting'] }).map((s) => s.id)
    expect(ids).not.toContain('class-features')
    expect(ids).toEqual(['class', 'origin', 'skills', 'equipment', 'ability-scores', 'spells', 'details', 'personality', 'review'])
  })

  test('a level-1 Wizard and Paladin see Spells', () => {
    for (const class_name of ['Wizard', 'Paladin']) {
      expect(visibleSteps(builder.steps, { ...builder.initialDraft(), class_name }).map((s) => s.id)).toContain('spells')
    }
  })
})

describe('exiting', () => {
  test('exit() marks the wizard as leaving on purpose; reset keeps it, start clears it', () => {
    store().start('dnd5e-2024')
    expect(store().exiting).toBe(false)
    store().exit()
    expect(store().exiting).toBe(true)
    store().reset()
    expect(store().exiting).toBe(true)
    store().start('dnd5e-2024')
    expect(store().exiting).toBe(false)
  })
})
