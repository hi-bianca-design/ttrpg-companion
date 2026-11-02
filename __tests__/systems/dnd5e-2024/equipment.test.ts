import { dnd5eBuilder } from '@/systems/dnd5e-2024/builder'
import { parseEquipmentOption, resolveEquipment } from '@/systems/dnd5e-2024/equipment'

const ITEMS = [
  { id: 'cm', name: 'Chain Mail', data: { category: 'Heavy Armor' } },
  { id: 'gs', name: 'Greatsword', data: { category: 'Martial Melee Weapon' } },
  { id: 'jv', name: 'Javelin', data: { category: 'Simple Melee Weapon' } },
  { id: 'sh', name: 'Shield', data: { category: 'Shield' } },
  { id: 'dg', name: 'Dagger', data: { category: 'Simple Melee Weapon' } },
]
const FIGHTER_A = "Option A: Chain Mail, Greatsword, Flail, 8 Javelins, Dungeoneer's Pack, 4 GP"

describe('parseEquipmentOption', () => {
  test('splits the label, item entries with counts and the gold', () => {
    expect(parseEquipmentOption(FIGHTER_A)).toEqual({
      label: 'Option A',
      entries: [
        { text: 'Chain Mail', name: 'Chain Mail', quantity: 1 },
        { text: 'Greatsword', name: 'Greatsword', quantity: 1 },
        { text: 'Flail', name: 'Flail', quantity: 1 },
        { text: '8 Javelins', name: 'Javelins', quantity: 8 },
        { text: "Dungeoneer's Pack", name: "Dungeoneer's Pack", quantity: 1 },
      ],
      gold: 4,
    })
  })

  test('a gold-only option has no entries', () => {
    expect(parseEquipmentOption('Option C: 155 GP')).toEqual({ label: 'Option C', entries: [], gold: 155 })
  })
})

describe('resolveEquipment', () => {
  test('matches entries to items (plural or not), equips weapons, armor and shields, lists the rest', () => {
    const option = parseEquipmentOption("Option A: Chain Mail, Shield, 2 Daggers, 8 Javelins, Quiver, Arcane Focus (orb), 4 GP")
    const { items, other } = resolveEquipment(option, ITEMS)
    expect(items).toEqual([
      { content_id: 'cm', quantity: 1, equipped: true },
      { content_id: 'sh', quantity: 1, equipped: true },
      { content_id: 'dg', quantity: 2, equipped: true },
      { content_id: 'jv', quantity: 8, equipped: true },
    ])
    expect(other).toEqual(['Quiver', 'Arcane Focus (orb)'])
  })

  test('an item missing from the content list falls back to the other-gear list with its count', () => {
    expect(resolveEquipment(parseEquipmentOption('Option A: 20 Arrows, 4 GP'), ITEMS)).toEqual({ items: [], other: ['20 Arrows'] })
  })
})

describe('equipment in the draft', () => {
  const step = dnd5eBuilder.steps.find((s) => s.id === 'equipment')!
  const base = {
    ...dnd5eBuilder.initialDraft(), class_id: 'ftr', class_name: 'Fighter',
    class_equipment_options: [FIGHTER_A, 'Option C: 155 GP'],
  }
  const picked = {
    ...base, equipment_option: 0, equipment_items: [{ content_id: 'cm', quantity: 1, equipped: true }],
    equipment_other: ["Dungeoneer's Pack"], equipment_gold: 4,
  }

  test('step follows skills, is never skipped and needs a choice', () => {
    const ids = dnd5eBuilder.steps.map((s) => s.id)
    expect(ids.indexOf('equipment')).toBe(ids.indexOf('skills') + 1)
    expect(step.skip).toBeUndefined()
    expect(step.isComplete(base)).toBe(false)
    expect(step.isComplete(picked)).toBe(true)
  })

  test('changing class clears the equipment choice', () => {
    const next = dnd5eBuilder.pruneDraft(picked, { class_id: 'wiz', class_name: 'Wizard', class_equipment_options: ['Option B: 55 GP'] })
    expect(next).toMatchObject({ equipment_option: null, equipment_items: [], equipment_other: [], equipment_gold: 0 })
    expect(dnd5eBuilder.pruneDraft(picked, { name: 'X' }).equipment_option).toBe(0)
  })

  test('toCharacter carries the items and the gold', () => {
    const c = dnd5eBuilder.toCharacter({ ...picked, name: 'Kara' })
    expect(c.items).toEqual([{ content_id: 'cm', quantity: 1, equipped: true }])
    expect(c.details).toMatchObject({ gold: 4, other_gear: ["Dungeoneer's Pack"] })
  })

  test('typed items reach other_gear without an option, and merge after the option items', () => {
    const typed = { ...base, equipment_custom: ["Grandfather's sword"], name: 'Kara' }
    expect(dnd5eBuilder.toCharacter(typed).details.other_gear).toEqual(["Grandfather's sword"])
    expect(dnd5eBuilder.toCharacter({ ...picked, equipment_custom: ['Rope, 50 ft'], name: 'Kara' }).details)
      .toMatchObject({ gold: 4, other_gear: ["Dungeoneer's Pack", 'Rope, 50 ft'] })
    expect(dnd5eBuilder.toCharacter({ ...base, name: 'Kara' }).details).not.toHaveProperty('other_gear')
  })

  test('typed items survive a class change and a new draft starts with none', () => {
    const next = dnd5eBuilder.pruneDraft({ ...picked, equipment_custom: ['Rope'] }, { class_id: 'wiz', class_name: 'Wizard', class_equipment_options: [] })
    expect(next.equipment_custom).toEqual(['Rope'])
    expect(dnd5eBuilder.initialDraft().equipment_custom).toEqual([])
  })
})
