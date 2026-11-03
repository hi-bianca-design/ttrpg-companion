// D&D 5e (2024, SRD 5.2) static definition: abilities, resources, conditions and
// content-kind metadata. Content-kind Zod schemas live in schemas.ts and are joined
// to this metadata in index.ts (keeps this file free of a definition↔schemas cycle).
import type { ContentKindDef, ResourceDef, StatDef } from '../types'
import { FEATURE_RESOURCE_DEFS } from './features'

export const ABILITY_KEYS = [
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
] as const
export type AbilityKey = typeof ABILITY_KEYS[number]

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
}

/** The 18 SRD 5.2 skills, keyed kebab-case (matches background `skill_proficiencies`). */
export const SKILLS: { key: string; label: string; ability: AbilityKey }[] = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dexterity' },
  { key: 'animal-handling', label: 'Animal Handling', ability: 'wisdom' },
  { key: 'arcana', label: 'Arcana', ability: 'intelligence' },
  { key: 'athletics', label: 'Athletics', ability: 'strength' },
  { key: 'deception', label: 'Deception', ability: 'charisma' },
  { key: 'history', label: 'History', ability: 'intelligence' },
  { key: 'insight', label: 'Insight', ability: 'wisdom' },
  { key: 'intimidation', label: 'Intimidation', ability: 'charisma' },
  { key: 'investigation', label: 'Investigation', ability: 'intelligence' },
  { key: 'medicine', label: 'Medicine', ability: 'wisdom' },
  { key: 'nature', label: 'Nature', ability: 'intelligence' },
  { key: 'perception', label: 'Perception', ability: 'wisdom' },
  { key: 'performance', label: 'Performance', ability: 'charisma' },
  { key: 'persuasion', label: 'Persuasion', ability: 'charisma' },
  { key: 'religion', label: 'Religion', ability: 'intelligence' },
  { key: 'sleight-of-hand', label: 'Sleight of Hand', ability: 'dexterity' },
  { key: 'stealth', label: 'Stealth', ability: 'dexterity' },
  { key: 'survival', label: 'Survival', ability: 'wisdom' },
]

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

/** SRD 5.2 alignments in 3×3 grid order (rows good → evil, columns lawful → chaotic). */
export const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
] as const

export const DND_STATS: StatDef[] = ABILITY_KEYS.map((key) => ({
  key,
  label: ABILITY_LABELS[key],
  short: key.slice(0, 3).toUpperCase(),
  min: 1,
  max: 30,
  default: 10,
}))

export const DND_RESOURCES: ResourceDef[] = [
  { key: 'hp', label: 'Hit Points', kind: 'pool', display: 'bar', emptyHint: 'At 0 HP: mark a death-save failure instead.' },
  { key: 'spell_slots', label: 'Spell Slots', kind: 'slots', display: 'pips', tierLabel: (tier) => `Level ${tier}`, tint: 'sky' },
  { key: 'hit_dice', label: 'Hit Dice', kind: 'pool', display: 'counter' },
  // Counted up from empty, and only relevant while the character is down (0 HP).
  { key: 'death_saves_success', label: 'Death Save Successes', kind: 'slots', display: 'pips', tint: 'sage', count: 'marked', showWhenEmpty: 'hp' },
  { key: 'death_saves_failure', label: 'Death Save Failures', kind: 'slots', display: 'pips', tint: 'terracotta', count: 'marked', showWhenEmpty: 'hp' },
  ...FEATURE_RESOURCE_DEFS,
]

/** The 15 SRD 5.2 conditions plus concentration, keyed lowercase. */
export const CONDITION_LABELS: Record<string, string> = {
  blinded: 'Blinded',
  charmed: 'Charmed',
  deafened: 'Deafened',
  exhaustion: 'Exhaustion',
  frightened: 'Frightened',
  grappled: 'Grappled',
  incapacitated: 'Incapacitated',
  invisible: 'Invisible',
  paralyzed: 'Paralyzed',
  petrified: 'Petrified',
  poisoned: 'Poisoned',
  prone: 'Prone',
  restrained: 'Restrained',
  stunned: 'Stunned',
  unconscious: 'Unconscious',
  concentrating: 'Concentrating',
}
export const DND_CONDITIONS = Object.keys(CONDITION_LABELS)

export const MAGIC_ITEM_RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies'] as const

export const ITEM_CATEGORIES = [
  'Simple Melee Weapon', 'Simple Ranged Weapon', 'Martial Melee Weapon', 'Martial Ranged Weapon',
  'Light Armor', 'Medium Armor', 'Heavy Armor', 'Shield',
]

export const SPELL_SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
]

/** Keys spells store in `classes` (lowercase; the builder's Spells step matches them case-insensitively). */
export const SPELLCASTING_CLASSES = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard']

export type ContentKindMeta = Omit<ContentKindDef, 'schema'>

/**
 * Field lists cover the scalar/array keys of each kind's `data` (name and description
 * live on the content row). Nested JSON (class features, species traits, item
 * properties) is validated by the schema but not exposed as a flat form field.
 */
export const DND_CONTENT_KIND_META: Record<string, ContentKindMeta> = {
  class: {
    kind: 'class', label: 'Class', plural: 'Classes', homebrew: true, isItem: false,
    fields: [
      { key: 'hit_die', label: 'Hit die', type: 'select', options: ['6', '8', '10', '12'], required: true },
      { key: 'primary_abilities', label: 'Primary abilities', type: 'multiselect', options: [...ABILITY_KEYS], required: true },
      { key: 'saving_throw_proficiencies', label: 'Saving throws', type: 'multiselect', options: [...ABILITY_KEYS], required: true },
      { key: 'spellcasting_ability', label: 'Spellcasting ability', type: 'select', options: [...ABILITY_KEYS] },
    ],
  },
  subclass: {
    kind: 'subclass', label: 'Subclass', plural: 'Subclasses', homebrew: true, isItem: false, parentKind: 'class',
    fields: [],
  },
  species: {
    kind: 'species', label: 'Species', plural: 'Species', homebrew: true, isItem: false,
    fields: [
      { key: 'speed', label: 'Speed', type: 'number', required: true },
      { key: 'size', label: 'Size', type: 'select', options: ['Small', 'Medium', 'Medium or Small'], required: true },
      { key: 'creature_type', label: 'Creature type', type: 'text', required: true },
    ],
  },
  background: {
    kind: 'background', label: 'Background', plural: 'Backgrounds', homebrew: true, isItem: false,
    fields: [
      { key: 'skill_proficiencies', label: 'Skill proficiencies', type: 'multiselect', options: SKILLS.map((s) => s.key), required: true },
      { key: 'origin_feat', label: 'Origin feat', type: 'text' },
      { key: 'tool_proficiency', label: 'Tool proficiency', type: 'text' },
    ],
  },
  feat: {
    kind: 'feat', label: 'Feat', plural: 'Feats', homebrew: true, isItem: false,
    fields: [
      { key: 'benefits', label: 'Benefits', type: 'longtext', required: true },
    ],
  },
  spell: {
    kind: 'spell', label: 'Spell', plural: 'Spells', homebrew: true, isItem: false,
    fields: [
      { key: 'level', label: 'Level', type: 'select', options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], required: true },
      { key: 'school', label: 'School', type: 'select', options: SPELL_SCHOOLS, required: true },
      { key: 'casting_time', label: 'Casting time', type: 'text', required: true },
      { key: 'range', label: 'Range', type: 'text', required: true },
      { key: 'components', label: 'Components', type: 'text', required: true },
      { key: 'duration', label: 'Duration', type: 'text', required: true },
      { key: 'classes', label: 'Classes', type: 'multiselect', options: SPELLCASTING_CLASSES, required: true },
      { key: 'is_ritual', label: 'Ritual', type: 'boolean' },
      { key: 'requires_concentration', label: 'Concentration', type: 'boolean' },
    ],
  },
  item: {
    kind: 'item', label: 'Item', plural: 'Items', homebrew: true, isItem: true,
    fields: [
      { key: 'category', label: 'Category', type: 'select', options: ITEM_CATEGORIES, required: true },
      { key: 'cost', label: 'Cost', type: 'text' },
      { key: 'weight', label: 'Weight', type: 'number' },
    ],
  },
  magic_item: {
    kind: 'magic_item', label: 'Magic item', plural: 'Magic items', homebrew: true, isItem: true,
    fields: [
      { key: 'item_type', label: 'Item type', type: 'text', required: true },
      { key: 'rarity', label: 'Rarity', type: 'select', options: [...MAGIC_ITEM_RARITIES], required: true },
      { key: 'requires_attunement', label: 'Requires attunement', type: 'boolean' },
      { key: 'attunement_condition', label: 'Attunement condition', type: 'text' },
    ],
  },
}
