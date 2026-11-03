import { getSystem, visibleSystems } from '@/systems/registry'
import { HOPE_MAX, TRAIT_KEYS } from '@/systems/daggerheart/definition'
import { canCreate, DH_DEFAULTS, initialDraft, SUGGESTED_TRAITS, suggestedTraits, toCharacter } from '@/systems/daggerheart/draft'
import { daggerheartDetailsSchema, daggerheartResourcesSchema, daggerheartStatsSchema } from '@/systems/daggerheart/schemas'

const dh = getSystem('daggerheart')

test('Daggerheart has its seven steps (still hidden from pickers)', () => {
  expect(visibleSystems().map((s) => s.id)).toEqual(['dnd5e-2024'])
  expect(dh.builder.steps.map((s) => s.id)).toEqual(['heritage', 'class', 'traits', 'domain-cards', 'vitals', 'details', 'review'])
})

test('the builder wires the draft module', () => {
  expect(dh.builder.initialDraft()).toEqual(initialDraft())
  expect(dh.builder.canCreate).toBe(canCreate)
  expect(dh.builder.toCharacter).toBe(toCharacter)
})

test('starting defaults: traits 0, HP 6, Armor 3, Evasion 10', () => {
  const d = initialDraft()
  expect(TRAIT_KEYS.map((k) => d[k])).toEqual([0, 0, 0, 0, 0, 0])
  expect(DH_DEFAULTS).toEqual({ hp: 6, armor: 3, evasion: 10, stress: 6, hope: 2 })
  expect([d.hp_max, d.armor_max, d.evasion]).toEqual([6, 3, 10])
})

test('canCreate needs a class and a name (whitespace does not count)', () => {
  expect(canCreate(initialDraft())).toBe(false)
  expect(canCreate({ ...initialDraft(), name: 'Wren' })).toBe(false)
  expect(canCreate({ ...initialDraft(), class_name: 'Ranger' })).toBe(false)
  expect(canCreate({ ...initialDraft(), class_name: '  ', name: 'Wren' })).toBe(false)
  expect(canCreate({ ...initialDraft(), class_name: 'Ranger', name: ' ' })).toBe(false)
  expect(canCreate({ ...initialDraft(), class_name: 'Ranger', name: 'Wren' })).toBe(true)
})

test('the suggested trait array is +2, +1, +1, 0, 0, -1 in trait order', () => {
  expect(SUGGESTED_TRAITS).toEqual([2, 1, 1, 0, 0, -1])
  expect(suggestedTraits()).toEqual({ agility: 2, strength: 1, finesse: 1, instinct: 0, presence: 0, knowledge: -1 })
})

test('a draft with only a name and a class makes a valid level 1 character', () => {
  const c = toCharacter({ ...initialDraft(), name: ' Wren ', class_name: ' Ranger ' })
  expect(c).toMatchObject({ system_id: 'daggerheart', name: 'Wren', level: 1, conditions: [], picks: [] })
  expect(c.stats).toEqual({ agility: 0, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 })
  expect(c.resources).toEqual({
    hp: { tiers: { '1': { max: 6, used: 0 } } },
    stress: { tiers: { '1': { max: 6, used: 0 } } },
    armor: { tiers: { '1': { max: 3, used: 0 } } },
    hope: { current: 2, max: HOPE_MAX },
  })
  expect(c.details).toMatchObject({ evasion: 10, experiences: [], class_name: 'Ranger' })
  expect(daggerheartStatsSchema.parse(c.stats)).toEqual(c.stats)
  expect(daggerheartResourcesSchema.parse(c.resources)).toEqual(c.resources)
  expect(daggerheartDetailsSchema.parse(c.details)).toEqual(c.details)
})

test('a full draft carries traits, vitals and the typed text into the character', () => {
  const c = toCharacter({
    ...initialDraft(), ...suggestedTraits(),
    name: 'Wren', ancestry: 'Faun', community: 'Wildborne', class_name: 'Ranger', subclass_name: 'Wayfinder',
    domain_cards: ['Gifted Tracker', ' ', 'Nature’s Tongue'], hp_max: 7, armor_max: 4, evasion: 12,
    experiences: ['Wilderness guide', ''], backstory: 'Raised by wolves.',
  })
  expect(c.stats).toEqual({ agility: 2, strength: 1, finesse: 1, instinct: 0, presence: 0, knowledge: -1 })
  expect(c.resources.hp).toEqual({ tiers: { '1': { max: 7, used: 0 } } })
  expect(c.resources.armor).toEqual({ tiers: { '1': { max: 4, used: 0 } } })
  expect(c.details).toEqual({
    evasion: 12, experiences: ['Wilderness guide'], ancestry: 'Faun', community: 'Wildborne',
    class_name: 'Ranger', subclass_name: 'Wayfinder', domain_cards: ['Gifted Tracker', 'Nature’s Tongue'],
    backstory: 'Raised by wolves.',
  })
  expect(daggerheartDetailsSchema.parse(c.details)).toEqual(c.details)
})

test('out-of-range or missing numbers fall back to valid values', () => {
  const c = toCharacter({ name: 'Wren', class_name: 'Bard', agility: 12, strength: -9, hp_max: null, armor_max: -2, evasion: 'x' })
  expect(c.stats.agility).toBe(8)
  expect(c.stats.strength).toBe(-5)
  expect(c.stats.finesse).toBe(0)
  expect(c.resources.hp).toEqual({ tiers: { '1': { max: 6, used: 0 } } })
  expect(c.resources.armor).toEqual({ tiers: { '1': { max: 0, used: 0 } } })
  expect(c.details.evasion).toBe(10)
  expect(daggerheartStatsSchema.parse(c.stats)).toEqual(c.stats)
  expect(daggerheartResourcesSchema.parse(c.resources)).toEqual(c.resources)
})

test('the details schema still parses the old { evasion, experiences } shape', () => {
  const old = { evasion: 10, experiences: ['Wilderness guide +2'] }
  expect(daggerheartDetailsSchema.parse(old)).toEqual(old)
  expect(() => daggerheartDetailsSchema.parse({ domain_cards: 'Book of Ava' })).toThrow()
})

test('only class and details steps count as filled in by their text', () => {
  const step = (id: string) => dh.builder.steps.find((s) => s.id === id)!
  const d = initialDraft()
  expect(step('class').isComplete(d)).toBe(false)
  expect(step('class').isComplete({ ...d, class_name: 'Bard' })).toBe(true)
  expect(step('details').isComplete({ ...d, name: 'Wren' })).toBe(true)
  expect(step('heritage').isComplete({ ...d, ancestry: 'Elf', community: 'Loreborne' })).toBe(true)
  expect(step('heritage').isComplete({ ...d, ancestry: 'Elf' })).toBe(false)
  expect(step('domain-cards').isComplete({ ...d, domain_cards: ['Book of Ava'] })).toBe(true)
  expect(step('traits').isComplete(d)).toBe(false)
  expect(step('traits').isComplete({ ...d, ...suggestedTraits() })).toBe(true)
  expect(dh.builder.steps.some((s) => s.skip)).toBe(false)
})
