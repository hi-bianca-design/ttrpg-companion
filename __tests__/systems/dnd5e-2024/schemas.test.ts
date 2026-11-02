import {
  dnd5eContentSchemas,
  dnd5eDetailsSchema,
  dnd5eStatsSchema,
  dnd5eResourcesSchema,
} from '@/systems/dnd5e-2024/schemas'
import { getSystem } from '@/systems/registry'

const acidSplash = {
  level: 0,
  school: 'Evocation',
  casting_time: 'Action',
  range: '60 feet',
  components: 'V, S',
  duration: 'Instantaneous',
  classes: ['sorcerer', 'wizard'],
  is_ritual: false,
  requires_concentration: false,
}

const stats = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 }

test('spell content data validates', () => {
  expect(dnd5eContentSchemas.spell.safeParse(acidSplash).success).toBe(true)
  const { level: _level, ...missingLevel } = acidSplash
  expect(dnd5eContentSchemas.spell.safeParse(missingLevel).success).toBe(false)
})

test('stats schema rejects 31', () => {
  expect(dnd5eStatsSchema.safeParse(stats).success).toBe(true)
  expect(dnd5eStatsSchema.safeParse({ ...stats, strength: 31 }).success).toBe(false)
})

test('stats schema rejects a missing ability', () => {
  const { charisma: _cha, ...rest } = stats
  expect(dnd5eStatsSchema.safeParse(rest).success).toBe(false)
})

test('class content data (SRD row shape) validates', () => {
  expect(dnd5eContentSchemas.class.safeParse({
    hit_die: 12,
    primary_abilities: ['strength'],
    saving_throw_proficiencies: ['strength', 'constitution'],
    features: {
      level_features: { '1': ['Rage', 'Unarmored Defense', 'Weapon Mastery'] },
      armor_training: ['Light Armor', 'Medium Armor', 'Shields'],
      skill_choices: { count: 2, from: ['Athletics', 'Survival'] },
    },
  }).success).toBe(true)
})

test('subclass, species, background, feat data validate', () => {
  expect(dnd5eContentSchemas.subclass.safeParse({
    features: { subclass_level: 3, level_features: { '3': ['Frenzy'] } },
  }).success).toBe(true)
  expect(dnd5eContentSchemas.species.safeParse({
    speed: 35, size: 'Medium', creature_type: 'Humanoid',
    traits: { traits: [{ name: 'Darkvision', description: 'You have Darkvision.' }] },
    ability_score_bonuses: {},
  }).success).toBe(true)
  expect(dnd5eContentSchemas.background.safeParse({
    skill_proficiencies: ['insight', 'religion'],
    ability_score_options: { abilities: ['intelligence', 'wisdom', 'charisma'] },
    origin_feat: 'Magic Initiate (Cleric)',
    tool_proficiency: "Calligrapher's Supplies",
  }).success).toBe(true)
  expect(dnd5eContentSchemas.feat.safeParse({
    prerequisites: { level: 4 },
    benefits: 'Increase one ability score by 2.',
    ability_score_bonuses: { options: 'any', amount: 2, or_split: true },
  }).success).toBe(true)
})

test('item and magic item data validate', () => {
  expect(dnd5eContentSchemas.item.safeParse({
    category: 'Medium Armor', cost: '50 GP', weight: 20,
    properties: { armor_class: '13 + Dex modifier (max 2)', strength_requirement: null, stealth_disadvantage: false },
  }).success).toBe(true)
  expect(dnd5eContentSchemas.magic_item.safeParse({
    item_type: 'Wondrous Item', rarity: 'Rare', requires_attunement: true,
    attunement_condition: null, properties: {},
  }).success).toBe(true)
  expect(dnd5eContentSchemas.magic_item.safeParse({
    item_type: 'Wondrous Item', rarity: 'Mythic', requires_attunement: false, properties: {},
  }).success).toBe(false)
})

test('resources schema validates a fresh character', () => {
  expect(dnd5eResourcesSchema.safeParse({
    hp: { current: 12, max: 12 },
    spell_slots: { tiers: {} },
    hit_dice: { current: 1, max: 1 },
    death_saves_success: { tiers: { '1': { max: 3, used: 0 } } },
    death_saves_failure: { tiers: { '1': { max: 3, used: 0 } } },
  }).success).toBe(true)
})

test('every content kind on the system has a schema', () => {
  const sys = getSystem('dnd5e-2024')
  expect(Object.keys(sys.contentKinds).sort()).toEqual(
    ['background', 'class', 'feat', 'item', 'magic_item', 'species', 'spell', 'subclass'],
  )
  expect(sys.contentKinds.spell.schema).toBe(dnd5eContentSchemas.spell)
  expect(sys.contentKinds.subclass.parentKind).toBe('class')
  expect(sys.contentKinds.class.homebrew).toBe(true)
  expect(Object.values(sys.contentKinds).every((k) => k.homebrew)).toBe(true)
})

test('class, species and background data keep an optional one_off flag', () => {
  const cls = { hit_die: 8, primary_abilities: [], saving_throw_proficiencies: [] }
  const species = { speed: 30, size: 'Medium', creature_type: 'Humanoid' }
  const bg = { skill_proficiencies: [] }
  for (const [kind, base] of [['class', cls], ['species', species], ['background', bg]] as const) {
    const schema = dnd5eContentSchemas[kind]
    expect((schema.parse({ ...base, one_off: true }) as { one_off?: boolean }).one_off).toBe(true)
    expect(schema.safeParse(base).success).toBe(true)
  }
})

test('details alignment uses SRD 5.2 naming ("Neutral", not "True Neutral")', () => {
  expect(dnd5eDetailsSchema.safeParse({ alignment: 'Neutral' }).success).toBe(true)
  expect(dnd5eDetailsSchema.safeParse({ alignment: 'True Neutral' }).success).toBe(false)
})
