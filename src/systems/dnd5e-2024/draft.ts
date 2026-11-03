// D&D 5e (2024) builder draft: initial values, pruning on change, completeness checks and
// the draft → NewCharacter conversion. Kept apart from builder.ts so step components can
// import it without a builder ↔ steps require cycle.
import type { Draft, NewCharacter, NewCustomContent } from '../types'
import { cachedClassFields, cleanName, customData, type CustomEntry, type CustomKind } from './customEntries'
import { ABILITY_KEYS } from './definition'
import { featureResources } from './features'
import { findOrder, getAbilityModifier, getMaxHP, getMaxSpellLevel, getSpellLimits, slotsFor } from './rules'

export const str = (v: unknown): string => (typeof v === 'string' ? v : '')
export const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
export const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function levelOf(draft: Draft): number {
  return Math.min(20, Math.max(1, num(draft.level, 1)))
}

export function hasSlots(draft: Draft): boolean {
  return Object.keys(slotsFor(str(draft.class_name), levelOf(draft)).tiers).length > 0
}

/** Background bonus (+2 / +1 / 0) for an ability. */
export function bonusFor(draft: Draft, key: string): number {
  return draft.bg_bonus_two === key ? 2 : draft.bg_bonus_one === key ? 1 : 0
}

/** Abilities the chosen background lets you raise (cached from the background when it's picked). */
export function bonusAbilities(draft: Draft): string[] {
  return strList(draft.bg_abilities).filter((a) => (ABILITY_KEYS as readonly string[]).includes(a))
}

/** Class skill picks that are still valid: on the class's list and not already granted by the background. */
export function validClassSkills(draft: Draft): string[] {
  const options = strList(draft.class_skill_options)
  const granted = strList(draft.bg_skills)
  return [...new Set(strList(draft.class_skills))].filter((k) => options.includes(k) && !granted.includes(k))
}

export const classSkillCount = (draft: Draft): number => num(draft.class_skill_count, 0)

/** True when exactly the class's number of skills is picked (trivially true for a class with none). */
export function classSkillsComplete(draft: Draft): boolean {
  return validClassSkills(draft).length === classSkillCount(draft) && strList(draft.class_skills).length === classSkillCount(draft)
}

/** Gold and other gear (option-resolved plus typed) for `details`; omitted when the draft has neither. */
function gearDetails(draft: Draft): { gold?: number; other_gear?: string[] } {
  const other = [...strList(draft.equipment_other), ...strList(draft.equipment_custom)]
  if (typeof draft.equipment_option !== 'number' && other.length === 0) return {}
  return { gold: num(draft.equipment_gold, 0), other_gear: other }
}

/** The class's starting equipment is chosen once an option is picked (trivially true with no options). */
export function equipmentComplete(draft: Draft): boolean {
  return strList(draft.class_equipment_options).length === 0 || typeof draft.equipment_option === 'number'
}

/** Skills the character is proficient in: valid class skill picks plus the background's granted skills (kebab-case). */
export function proficientSkills(draft: Draft): string[] {
  return [...new Set([...validClassSkills(draft), ...strList(draft.bg_skills)])]
}

/** The class choices typed or picked so far (choice key → values), non-string entries dropped. */
export function classChoices(draft: Draft): Record<string, string[]> {
  const raw = draft.class_choices && typeof draft.class_choices === 'object' ? (draft.class_choices as Record<string, unknown>) : {}
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, strList(v)]))
}

/** An order that grants a cantrip (Thaumaturge, Magician) raises the cantrip limit by one. */
export const extraCantrips = (draft: Draft): number =>
  findOrder(str(draft.class_name), classChoices(draft).order?.[0])?.cantrip ? 1 : 0

const spellLevel = (draft: Draft, id: string): number | undefined => {
  const v = ((draft.spell_levels ?? {}) as Record<string, unknown>)[id]
  return typeof v === 'number' ? v : undefined
}

/** Chosen cantrips / leveled spells, and whether any pick is above the max spell level. */
export function spellCounts(draft: Draft) {
  const max = getMaxSpellLevel(str(draft.class_name), levelOf(draft))
  let cantrips = 0
  let spells = 0
  let tooHigh = false
  for (const id of strList(draft.spell_ids)) {
    const lvl = spellLevel(draft, id) ?? 0
    if (lvl === 0) cantrips++
    else spells++
    if (lvl > max) tooHigh = true
  }
  return { cantrips, spells, tooHigh }
}

/** True when the chosen spells fit the class's SRD 5.2 limits and max spell level. */
export function spellsWithinLimits(draft: Draft): boolean {
  const limits = getSpellLimits(str(draft.class_name), levelOf(draft))
  const maxCantrips = limits.maxCantrips + extraCantrips(draft)
  const maxSpells = limits.maxSpells
  const { cantrips, spells, tooHigh } = spellCounts(draft)
  return !tooHigh && cantrips <= maxCantrips && spells <= maxSpells
}

/** Drops spells above the max spell level, then trims cantrips and spells to the limits (earliest picks kept). */
function fitSpells(draft: Draft): string[] {
  const cls = str(draft.class_name)
  const level = levelOf(draft)
  const max = getMaxSpellLevel(cls, level)
  const limits = getSpellLimits(cls, level)
  const maxCantrips = limits.maxCantrips + extraCantrips(draft)
  const maxSpells = limits.maxSpells
  let cantrips = 0
  let spells = 0
  return strList(draft.spell_ids).filter((id) => {
    const lvl = spellLevel(draft, id) ?? 0
    if (lvl > max) return false
    if (lvl === 0) return ++cantrips <= maxCantrips
    return ++spells <= maxSpells
  })
}

const CUSTOM_KINDS: readonly CustomKind[] = ['class', 'species', 'background']

/** A draft's `*_custom` value as a `CustomEntry`, or null when unset or malformed. */
export function customEntry(v: unknown): CustomEntry | null {
  if (!v || typeof v !== 'object') return null
  const e = v as Record<string, unknown>
  if (typeof e.name !== 'string') return null
  const extras = e.extras && typeof e.extras === 'object' && !Array.isArray(e.extras) ? (e.extras as Record<string, unknown>) : {}
  return { name: e.name, description: str(e.description), library: e.library === true, extras }
}

/** A custom class whose name is not blank (the only kind that counts towards canCreate). */
const namedCustomClass = (draft: Draft): CustomEntry | null => {
  const e = customEntry(draft.class_custom)
  return e && cleanName(e.name) ? e : null
}

/** The class pick's state, shared by an official class pick and a custom class's pick so they cannot drift. */
function classPickState(draft: Draft): Record<string, unknown> {
  const choices = Object.fromEntries(Object.entries(classChoices(draft))
    .map(([k, v]) => [k, v.map((s) => s.trim()).filter((s) => s.length > 0)] as const)
    .filter(([, v]) => v.length > 0))
  return { skills: validClassSkills(draft), ...(Object.keys(choices).length > 0 ? { choices } : {}) }
}

/** True when all six abilities hold a finite number (any value, not just the standard array). */
export function abilitiesFilled(draft: Draft): boolean {
  return ABILITY_KEYS.every((k) => typeof draft[k] === 'number' && Number.isFinite(draft[k]))
}

/**
 * Draft keys:
 * - class_id, class_name, hit_die (cached from the class pick), subclass_id, level
 * - class_custom, species_custom, background_custom: a pending "make your own" `CustomEntry` (or null),
 *   turned into a content row at Create time. Each excludes its official id (class_id / species_id /
 *   background_id): setting one nulls the other. A custom class fills the class cache (class_name, hit_die,
 *   class_skill_count, class_skill_options, …) from `cachedClassFields` and never has a subclass; a custom
 *   background has no ability options (bg_abilities []) and grants the skills in its extras (bg_skills)
 * - species_id, background_id, bg_abilities (the background's eligible abilities, cached on pick),
 *   bg_skills (its granted skills, kebab-case, cached on pick)
 * - class_skill_count, class_skill_options (the class's skill picks, cached on the class pick) and
 *   class_skills (the picks)
 * - class_equipment_options (the class's option strings, cached on the class pick), equipment_option (index
 *   picked), equipment_items / equipment_other / equipment_gold (the picked option, resolved when chosen),
 *   equipment_custom (items the player typed; kept across class and option changes)
 * - class_features (the class's level-1 feature names, cached on the class pick) and class_choices
 *   (choice key → typed or picked values: fighting_style, weapon_mastery, expertise, order)
 * - the six ability keys (null until assigned from the standard array),
 *   bg_bonus_two / bg_bonus_one (ability keys receiving +2 / +1)
 * - spell_ids, spell_classes (spell id → lowercase class list) and spell_levels (spell id →
 *   level), both cached by the spells step so pruneDraft can stay pure
 * - name, alignment, personality_trait, ideal, bond, flaw, appearance, backstory
 */
export function initialDraft(): Draft {
  return {
    class_id: null,
    class_name: null,
    hit_die: null,
    subclass_id: null,
    level: 1,
    species_id: null,
    background_id: null,
    class_custom: null,
    species_custom: null,
    background_custom: null,
    bg_abilities: [],
    bg_skills: [],
    class_skill_count: 0,
    class_skill_options: [],
    class_skills: [],
    class_equipment_options: [],
    equipment_option: null,
    equipment_items: [],
    equipment_other: [],
    equipment_gold: 0,
    equipment_custom: [],
    class_features: [],
    class_choices: {},
    ...Object.fromEntries(ABILITY_KEYS.map((k) => [k, null])),
    bg_bonus_two: null,
    bg_bonus_one: null,
    spell_ids: [],
    spell_classes: {},
    spell_levels: {},
    name: '',
    alignment: '',
    personality_trait: '',
    ideal: '',
    bond: '',
    flaw: '',
    appearance: '',
    backstory: '',
  }
}

/**
 * Merges `changed` into `draft`, then keeps dependent choices valid:
 * - an official id and its custom entry exclude each other (the one the patch sets non-null wins);
 * - setting a custom class fills the class cache from it (keys the patch sets are kept) and a custom class
 *   has no subclass; any change of class_custom (set, edit, clear) is a class change;
 * - a change of background_custom is a background change; a custom background takes bg_skills from its
 *   extras unless the patch sets them;
 * - a background change clears the bonuses (and its cached ability list) unless the patch sets them;
 * - a class change resets the subclass, clears the class skill picks (unless the patch carries the new
 *   class's skill list) and drops spells off the new class list;
 * - a background or class change drops class skill picks the background now grants;
 * - a class change clears the class choices;
 * - a class or level change, or a class choices change (an order may grant a cantrip), drops spells above
 *   the new max spell level and trims to the new limits.
 */
export function pruneDraft(draft: Draft, changed: Partial<Draft>): Draft {
  const next: Draft = { ...draft, ...changed }
  for (const kind of CUSTOM_KINDS) {
    const idKey = `${kind}_id`
    const customKey = `${kind}_custom`
    if (changed[customKey] != null) next[idKey] = null
    else if (changed[idKey] != null) next[customKey] = null
  }
  // undefined (a draft from before the key existed) and null both mean "unset".
  const moved = (key: string) => (next[key] ?? null) !== (draft[key] ?? null)
  const classEntry = customEntry(next.class_custom)
  if (changed.class_custom != null && classEntry) {
    for (const [k, v] of Object.entries(cachedClassFields(classEntry))) if (!(k in changed)) next[k] = v
  }
  if (moved('background_id') || moved('background_custom')) {
    const bgEntry = customEntry(next.background_custom)
    if (!('bg_bonus_two' in changed)) next.bg_bonus_two = null
    if (!('bg_bonus_one' in changed)) next.bg_bonus_one = null
    if (!('bg_abilities' in changed)) next.bg_abilities = []
    if (!('bg_skills' in changed)) {
      next.bg_skills = bgEntry ? (customData('background', bgEntry.extras, false) as { skill_proficiencies: string[] }).skill_proficiencies : []
    }
  }
  const classChanged = moved('class_id') || moved('class_custom')
  const levelChanged = 'level' in changed && changed.level !== draft.level
  if (classChanged) {
    const cls = str(next.class_name).toLowerCase()
    const lists = (next.spell_classes ?? {}) as Record<string, string[]>
    next.subclass_id = null
    if (!('class_skill_options' in changed)) next.class_skills = []
    next.spell_ids = strList(next.spell_ids).filter((id) => strList(lists[id]).map((c) => c.toLowerCase()).includes(cls))
  }
  if (classChanged) {
    next.class_skills = []
    next.equipment_option = null
    next.equipment_items = []
    next.equipment_other = []
    next.equipment_gold = 0
    next.class_choices = {}
  }
  else next.class_skills = validClassSkills(next)
  if (classChanged || levelChanged || 'class_choices' in changed) next.spell_ids = fitSpells(next)
  if (classEntry) next.subclass_id = null
  return next
}

/** A character can be created once it has a class (official, or custom with a name) and a name; everything else is optional. */
export function canCreate(draft: Draft): boolean {
  const hasClass = (typeof draft.class_id === 'string' && draft.class_id !== '') || namedCustomClass(draft) !== null
  return hasClass && str(draft.name).trim().length > 0
}

/** One `custom` entry per named `*_custom` in the draft; the class's pick state matches an official class pick's. */
function customContent(draft: Draft): NewCustomContent[] {
  return CUSTOM_KINDS.flatMap((kind) => {
    const e = customEntry(draft[`${kind}_custom`])
    const name = e ? cleanName(e.name) : ''
    if (!e || !name) return []
    return [{
      kind,
      name,
      description: e.description.trim(),
      data: customData(kind, e.extras, !e.library),
      library: e.library,
      pick: { state: kind === 'class' ? classPickState(draft) : {}, acquired_at_level: 1 },
    }]
  })
}

export function toCharacter(draft: Draft): NewCharacter {
  const level = levelOf(draft)
  const stats = Object.fromEntries(ABILITY_KEYS.map((k) => [k, Math.min(20, num(draft[k], 10) + bonusFor(draft, k))]))
  // The wizard caches hit_die from the class (custom ones too); without it a custom class falls back to its own.
  const customClass = customEntry(draft.class_custom)
  const hitDieFallback = customClass ? cachedClassFields(customClass).hit_die : 8
  const hpMax = Math.max(1, getMaxHP(level, num(draft.hit_die, hitDieFallback), getAbilityModifier(stats.constitution)))
  const custom = customContent(draft)
  const pick = (kind: string, id: unknown, acquired_at_level: number) =>
    typeof id === 'string' && id ? [{ content_id: id, kind, state: {}, acquired_at_level }] : []

  return {
    system_id: 'dnd5e-2024',
    name: str(draft.name).trim(),
    level,
    stats,
    resources: {
      hp: { current: hpMax, max: hpMax },
      spell_slots: slotsFor(str(draft.class_name), level),
      hit_dice: { current: level, max: level },
      ...featureResources(str(draft.class_name), level, stats),
      death_saves_success: { tiers: { '1': { max: 3, used: 0 } } },
      death_saves_failure: { tiers: { '1': { max: 3, used: 0 } } },
    },
    conditions: [],
    details: {
      ...gearDetails(draft),
      alignment: str(draft.alignment),
      personality_trait: str(draft.personality_trait),
      ideal: str(draft.ideal),
      bond: str(draft.bond),
      flaw: str(draft.flaw),
      appearance: str(draft.appearance),
      backstory: str(draft.backstory),
    },
    items: Array.isArray(draft.equipment_items) ? (draft.equipment_items as NewCharacter['items']) : [],
    picks: [
      ...(typeof draft.class_id === 'string' && draft.class_id
        ? [{ content_id: draft.class_id, kind: 'class', state: classPickState(draft), acquired_at_level: 1 }]
        : []),
      ...(customClass ? [] : pick('subclass', draft.subclass_id, level)),
      ...pick('species', draft.species_id, 1),
      ...pick('background', draft.background_id, 1),
      ...strList(draft.spell_ids).map((id) => ({ content_id: id, kind: 'spell', state: { prepared: false }, acquired_at_level: level })),
    ],
    ...(custom.length > 0 ? { custom } : {}),
  }
}
