// Zod schemas for every JSON shape the D&D 5e module stores: character stats,
// resources and details, plus each content kind's `data`. Content `data` mirrors the
// legacy SRD table columns minus id/name/description (subclass class_id → content.parent_id).
import { z } from 'zod'
import { ABILITY_KEYS, ALIGNMENTS, MAGIC_ITEM_RARITIES } from './definition'

const int = z.number().int()
const nonNegInt = int.min(0)

export const poolSchema = z.object({ current: nonNegInt, max: nonNegInt, temp: nonNegInt.optional() })
export const slotsSchema = z.object({
  tiers: z.record(z.string(), z.object({ max: nonNegInt, used: nonNegInt })),
})

const ability = int.min(1).max(30)
export const dnd5eStatsSchema = z.object(
  Object.fromEntries(ABILITY_KEYS.map((k) => [k, ability])) as Record<typeof ABILITY_KEYS[number], typeof ability>,
)

export const dnd5eResourcesSchema = z.object({
  hp: poolSchema,
  spell_slots: slotsSchema,
  hit_dice: poolSchema,
  death_saves_success: slotsSchema,
  death_saves_failure: slotsSchema,
}).catchall(z.union([poolSchema, slotsSchema])) // class feature uses (second_wind, ...) sit beside the core resources

export const dnd5eDetailsSchema = z.object({
  alignment: z.union([z.enum(ALIGNMENTS), z.literal('')]).optional(),
  personality_trait: z.string().optional(),
  ideal: z.string().optional(),
  bond: z.string().optional(),
  flaw: z.string().optional(),
  appearance: z.string().optional(),
  backstory: z.string().optional(),
  gold: nonNegInt.optional(),
  other_gear: z.array(z.string()).optional(),
  xp: nonNegInt.optional(),
  inspiration: z.boolean().optional(),
  languages: z.array(z.string()).optional(),
})

const levelFeatures = z.record(z.string(), z.array(z.string()))
const looseRecord = z.record(z.string(), z.unknown())

const classData = z.object({
  one_off: z.boolean().optional(),
  hit_die: int.positive(),
  primary_abilities: z.array(z.string()),
  spellcasting_ability: z.enum(ABILITY_KEYS).optional(),
  saving_throw_proficiencies: z.array(z.string()),
  features: z.looseObject({
    level_features: levelFeatures.optional(),
    armor_training: z.array(z.string()).optional(),
    weapon_proficiencies: z.array(z.string()).optional(),
    tool_proficiencies: z.array(z.string()).optional(),
    skill_choices: z.object({ count: nonNegInt, from: z.array(z.string()) }).optional(),
    saving_throws: z.array(z.string()).optional(),
    starting_equipment_options: z.array(z.string()).optional(),
  }).default({}),
})

const subclassData = z.object({
  features: z.looseObject({
    subclass_level: int.positive().optional(),
    level_features: levelFeatures.optional(),
  }).default({}),
})

const speciesData = z.object({
  one_off: z.boolean().optional(),
  speed: nonNegInt,
  size: z.string(),
  creature_type: z.string(),
  traits: z.looseObject({
    traits: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
    size_note: z.string().optional(),
  }).default({}),
  ability_score_bonuses: looseRecord.default({}),
  languages: z.array(z.string()).optional(),
})

const backgroundData = z.object({
  one_off: z.boolean().optional(),
  skill_proficiencies: z.array(z.string()),
  ability_score_options: z.looseObject({ abilities: z.array(z.string()).optional() }).default({}),
  origin_feat: z.string().nullable().optional(),
  tool_proficiency: z.string().nullable().optional(),
  languages: z.array(z.string()).optional(),
})

const featData = z.object({
  prerequisites: looseRecord.default({}),
  benefits: z.string(),
  ability_score_bonuses: looseRecord.default({}),
})

const spellData = z.object({
  level: int.min(0).max(9),
  school: z.string(),
  casting_time: z.string(),
  range: z.string(),
  components: z.string(),
  duration: z.string(),
  classes: z.array(z.string()),
  is_ritual: z.boolean().default(false),
  requires_concentration: z.boolean().default(false),
})

const itemData = z.object({
  category: z.string(),
  cost: z.string().nullable().optional(),
  weight: z.number().min(0).nullable().optional(),
  properties: z.looseObject({
    armor_class: z.string().optional(),          // e.g. "13 + Dex modifier (max 2)" or "18"
    armor_class_bonus: int.optional(),           // shields
    strength_requirement: int.nullable().optional(),
    stealth_disadvantage: z.boolean().optional(),
    damage: z.string().optional(),
    damage_type: z.string().optional(),
    weapon_properties: z.array(z.string()).optional(),
    mastery: z.string().optional(),
    range: z.string().optional(),
  }).default({}),
})

const magicItemData = z.object({
  item_type: z.string(),
  rarity: z.enum(MAGIC_ITEM_RARITIES),
  requires_attunement: z.boolean().default(false),
  attunement_condition: z.string().nullable().optional(),
  properties: looseRecord.default({}),
})

export const dnd5eContentSchemas = {
  class: classData,
  subclass: subclassData,
  species: speciesData,
  background: backgroundData,
  feat: featData,
  spell: spellData,
  item: itemData,
  magic_item: magicItemData,
}
