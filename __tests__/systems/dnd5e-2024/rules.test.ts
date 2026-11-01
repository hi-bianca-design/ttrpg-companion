import {
  getAbilityModifier,
  getProficiencyBonus,
  formatModifier,
  getMaxHP,
  SPELLCASTING_CLASSES,
  getMaxSpellLevel,
  slotsFor,
  derived,
  rest,
} from '@/systems/dnd5e-2024/rules'
import { dnd5eBuilder } from '@/systems/dnd5e-2024/builder'
import { getSystem, SYSTEMS } from '@/systems/registry'
import type { CharacterRecord, PickRecord, SlotsValue, SystemId } from '@/systems/types'

// ── Ported from __tests__/modules/character/character.utils.test.ts ──

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

// ── Spell slots ──

test('wizard 5 slots', () => expect(slotsFor('Wizard', 5).tiers).toEqual({ '1': { max: 4, used: 0 }, '2': { max: 3, used: 0 }, '3': { max: 2, used: 0 } }))
test('paladin 1 has two level-1 slots', () => expect(slotsFor('Paladin', 1).tiers).toEqual({ '1': { max: 2, used: 0 } }))
test('ranger 1 has two level-1 slots (SRD 5.2)', () => expect(slotsFor('Ranger', 1).tiers).toEqual({ '1': { max: 2, used: 0 } }))
test('paladin 3 / 13 / 19 half-caster slots', () => {
  const maxes = (lvl: number) => Object.values(slotsFor('Paladin', lvl).tiers).map((t) => t.max)
  expect(maxes(3)).toEqual([3])
  expect(maxes(13)).toEqual([4, 3, 3, 1])
  expect(maxes(19)).toEqual([4, 3, 3, 3, 2])
})
test('warlock 5 pact slots', () => expect(slotsFor('Warlock', 5).tiers).toEqual({ '3': { max: 2, used: 0 } }))
test('wizard 20 slots', () => {
  const maxes = Object.fromEntries(Object.entries(slotsFor('Wizard', 20).tiers).map(([t, s]) => [t, s.max]))
  expect(maxes).toEqual({ '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 2, '7': 2, '8': 1, '9': 1 })
})
test('ranger 5 half-caster slots', () => expect(slotsFor('Ranger', 5).tiers).toEqual({ '1': { max: 4, used: 0 }, '2': { max: 2, used: 0 } }))
test('class name is case-insensitive', () => expect(slotsFor('wizard', 1).tiers).toEqual({ '1': { max: 2, used: 0 } }))
describe('getMaxSpellLevel agrees with slotsFor', () => {
  const highestTier = (cls: string, lvl: number) =>
    Math.max(0, ...Object.keys(slotsFor(cls, lvl).tiers).map(Number))
  it.each(SPELLCASTING_CLASSES)('%s, levels 1–20', (cls) => {
    for (let lvl = 1; lvl <= 20; lvl++) expect(getMaxSpellLevel(cls, lvl)).toBe(highestTier(cls, lvl))
  })
  it('known values', () => {
    expect(getMaxSpellLevel('Ranger', 1)).toBe(1)
    expect(getMaxSpellLevel('Ranger', 5)).toBe(2)
    expect(getMaxSpellLevel('Ranger', 17)).toBe(5)
    expect(getMaxSpellLevel('Warlock', 9)).toBe(5)
    expect(getMaxSpellLevel('Wizard', 17)).toBe(9)
    expect(getMaxSpellLevel('Fighter', 20)).toBe(0)
  })
  it('is case-insensitive', () => expect(getMaxSpellLevel('ranger', 5)).toBe(2))
})
test('fighter has no slots', () => expect(slotsFor('Fighter', 10).tiers).toEqual({}))

// ── Fixtures ──

const stats = { strength: 15, dexterity: 8, constitution: 14, intelligence: 16, wisdom: 12, charisma: 10 }

function makeCharacter(over: Partial<CharacterRecord> = {}): CharacterRecord {
  return {
    id: 'c1',
    system_id: 'dnd5e-2024',
    name: 'Test',
    level: 5,
    stats,
    resources: {
      hp: { current: 3, max: 30, temp: 4 },
      spell_slots: { tiers: { '1': { max: 4, used: 4 }, '2': { max: 3, used: 2 }, '3': { max: 2, used: 1 } } },
      hit_dice: { current: 1, max: 5 },
      death_saves_success: { tiers: { '1': { max: 3, used: 1 } } },
      death_saves_failure: { tiers: { '1': { max: 3, used: 2 } } },
    },
    conditions: [],
    details: {},
    ...over,
  }
}

function pick(kind: string, name: string, data: unknown, state: Record<string, unknown> = {}): PickRecord {
  return { content_id: `${kind}-${name}`, kind, state, acquired_at_level: 1, content: { name, data } }
}

const wizardPick = pick('class', 'Wizard', { hit_die: 6 })
const warlockPick = pick('class', 'Warlock', { hit_die: 8 })

// ── Rest ──

test('long rest restores slots and hp', () => {
  const next = rest(makeCharacter(), 'long', [wizardPick])
  expect(next.hp).toEqual({ current: 30, max: 30, temp: 0 })
  const slots = next.spell_slots as SlotsValue
  Object.values(slots.tiers).forEach((t) => expect(t.used).toBe(0))
  expect(slots.tiers['1'].max).toBe(4)
})

test('long rest restores half hit dice (min 1), capped at max', () => {
  expect(rest(makeCharacter(), 'long', [wizardPick]).hit_dice).toEqual({ current: 3, max: 5 })
  const lvl1 = makeCharacter({ level: 1, resources: { ...makeCharacter().resources, hit_dice: { current: 0, max: 1 } } })
  expect(rest(lvl1, 'long', [wizardPick]).hit_dice).toEqual({ current: 1, max: 1 })
  const full = makeCharacter({ resources: { ...makeCharacter().resources, hit_dice: { current: 4, max: 5 } } })
  expect(rest(full, 'long', [wizardPick]).hit_dice).toEqual({ current: 5, max: 5 })
})

test('long rest resets death saves', () => {
  const next = rest(makeCharacter(), 'long', [wizardPick])
  expect((next.death_saves_success as SlotsValue).tiers['1'].used).toBe(0)
  expect((next.death_saves_failure as SlotsValue).tiers['1'].used).toBe(0)
})

test('short rest leaves a wizard unchanged', () => {
  const c = makeCharacter()
  expect(rest(c, 'short', [wizardPick])).toEqual(c.resources)
})

test('short rest restores warlock pact slots only', () => {
  const c = makeCharacter({ resources: { ...makeCharacter().resources, spell_slots: { tiers: { '3': { max: 2, used: 2 } } } } })
  const next = rest(c, 'short', [warlockPick])
  expect(next.spell_slots).toEqual({ tiers: { '3': { max: 2, used: 0 } } })
  expect(next.hp).toEqual(c.resources.hp)
  expect(next.hit_dice).toEqual(c.resources.hit_dice)
})

// ── Derived ──

function value(c: CharacterRecord, picks: PickRecord[], key: string) {
  return derived(c, picks).find((d) => d.key === key)
}

test('derived modifiers', () => {
  const d = derived(makeCharacter(), [])
  expect(d.find((x) => x.key === 'strength_mod')).toMatchObject({ value: 2, format: 'modifier' })
  expect(d.find((x) => x.key === 'dexterity_mod')).toMatchObject({ value: -1, format: 'modifier' })
  expect(d.filter((x) => x.key.endsWith('_mod'))).toHaveLength(6)
})

test('derived proficiency, initiative, passive perception', () => {
  const c = makeCharacter()
  expect(value(c, [], 'proficiency')?.value).toBe(3)
  expect(value(c, [], 'initiative')?.value).toBe(-1)
  expect(value(c, [], 'passive_perception')?.value).toBe(11)
})

test('passive perception adds proficiency when a pick grants Perception', () => {
  const bg = pick('background', 'Outlander', { skill_proficiencies: ['perception', 'survival'] })
  expect(value(makeCharacter(), [bg], 'passive_perception')?.value).toBe(14)
})

test('Alert feat adds proficiency to initiative', () => {
  expect(value(makeCharacter(), [pick('feat', 'Alert', {})], 'initiative')?.value).toBe(2)
})

test('speed comes from the species pick, default 30', () => {
  expect(value(makeCharacter(), [], 'speed')?.value).toBe(30)
  expect(value(makeCharacter(), [pick('species', 'Goliath', { speed: 35 })], 'speed')?.value).toBe(35)
})

test('AC: unarmored is 10 + DEX', () => expect(value(makeCharacter(), [], 'ac')?.value).toBe(9))

test('AC: equipped medium armor caps DEX, shield adds 2', () => {
  const c = makeCharacter({ stats: { ...stats, dexterity: 18 } })
  const chain = pick('item', 'Chain Shirt', { category: 'Medium Armor', properties: { armor_class: '13 + Dex modifier (max 2)' } }, { equipped: true })
  const shield = pick('item', 'Shield', { category: 'Shield', properties: { armor_class_bonus: 2 } }, { equipped: true })
  expect(value(c, [chain], 'ac')?.value).toBe(15)
  expect(value(c, [chain, shield], 'ac')?.value).toBe(17)
})

test('AC: heavy armor ignores DEX; unequipped armor is ignored', () => {
  const plate = pick('item', 'Plate Armor', { category: 'Heavy Armor', properties: { armor_class: '18' } }, { equipped: true })
  const unequipped = pick('item', 'Plate Armor', { category: 'Heavy Armor', properties: { armor_class: '18' } })
  expect(value(makeCharacter(), [plate], 'ac')?.value).toBe(18)
  expect(value(makeCharacter(), [unequipped], 'ac')?.value).toBe(9)
})

// ── Registry & definition ──

test('registry returns the D&D module and throws on unknown ids', () => {
  expect(getSystem('dnd5e-2024').id).toBe('dnd5e-2024')
  expect(SYSTEMS.map((s) => s.id)).toContain('dnd5e-2024')
  expect(() => getSystem('nope' as SystemId)).toThrow('Unknown game system: nope')
})

test('definition values', () => {
  const sys = getSystem('dnd5e-2024')
  expect(sys.stats.map((s) => s.key)).toEqual(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])
  sys.stats.forEach((s) => expect(s).toMatchObject({ min: 1, max: 30, default: 10 }))
  expect(sys.resources.map((r) => r.key)).toEqual(['hp', 'spell_slots', 'hit_dice', 'death_saves_success', 'death_saves_failure'])
  const slots = sys.resources.find((r) => r.key === 'spell_slots')
  expect(slots).toMatchObject({ kind: 'slots', display: 'pips', tint: 'sky' })
  expect(slots?.kind === 'slots' && slots.tierLabel?.('3')).toBe('Level 3')
  expect(sys.conditions).toHaveLength(16)
  expect(sys.conditions).toContain('concentrating')
  expect(sys.conditions).toContain('exhaustion')
})

// ── Builder ──

test('builder step ids', () => {
  expect(dnd5eBuilder.steps.map((s) => s.id)).toEqual(['class', 'origin', 'ability-scores', 'spells', 'details', 'personality', 'review'])
})

test('spells step is skipped when the class has no slots at the starting level', () => {
  const spells = dnd5eBuilder.steps.find((s) => s.id === 'spells')!
  expect(spells.skip?.({ ...dnd5eBuilder.initialDraft(), class_name: 'Fighter', level: 1 })).toBe(true)
  expect(spells.skip?.({ ...dnd5eBuilder.initialDraft(), class_name: 'Paladin', level: 1 })).toBe(false)
  expect(spells.skip?.({ ...dnd5eBuilder.initialDraft(), class_name: 'Wizard', level: 1 })).toBe(false)
})

test('pruneDraft drops off-list spells and resets subclass when class changes', () => {
  const draft = {
    ...dnd5eBuilder.initialDraft(),
    class_id: 'wiz', class_name: 'Wizard', subclass_id: 'evoker',
    spell_ids: ['s1', 's2'],
    spell_classes: { s1: ['wizard', 'sorcerer'], s2: ['wizard'] },
  }
  const next = dnd5eBuilder.pruneDraft(draft, { class_id: 'sorc', class_name: 'Sorcerer' })
  expect(next.class_id).toBe('sorc')
  expect(next.subclass_id).toBeNull()
  expect(next.spell_ids).toEqual(['s1'])
})

test('pruneDraft leaves spells and subclass alone when class is unchanged', () => {
  const draft = { ...dnd5eBuilder.initialDraft(), class_id: 'wiz', class_name: 'Wizard', subclass_id: 'evoker', spell_ids: ['s2'], spell_classes: { s2: ['wizard'] } }
  const next = dnd5eBuilder.pruneDraft(draft, { name: 'Elminster' })
  expect(next).toMatchObject({ name: 'Elminster', subclass_id: 'evoker', spell_ids: ['s2'] })
})

test('toCharacter builds a valid level-1 wizard', () => {
  const sys = getSystem('dnd5e-2024')
  const draft = {
    ...dnd5eBuilder.initialDraft(),
    name: 'Mira', class_id: 'wiz', class_name: 'Wizard', hit_die: 6,
    species_id: 'elf', background_id: 'sage',
    strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10,
    bg_bonus_two: 'intelligence', bg_bonus_one: 'constitution',
    alignment: 'Neutral Good', spell_ids: ['s1'],
  }
  const c = dnd5eBuilder.toCharacter(draft)
  expect(c.system_id).toBe('dnd5e-2024')
  expect(c.stats).toMatchObject({ intelligence: 17, constitution: 14 })
  expect(c.resources.hp).toEqual({ current: 8, max: 8 })
  expect(c.resources.spell_slots).toEqual({ tiers: { '1': { max: 2, used: 0 } } })
  expect(c.details).toMatchObject({ alignment: 'Neutral Good' })
  expect(c.picks.map((p) => p.kind).sort()).toEqual(['background', 'class', 'species', 'spell'])
  expect(sys.schemas.stats.safeParse(c.stats).success).toBe(true)
  expect(sys.schemas.resources.safeParse(c.resources).success).toBe(true)
  expect(sys.schemas.details.safeParse(c.details).success).toBe(true)
})
