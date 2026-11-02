// D&D 5e (2024) builder draft: initial values, pruning on change, completeness checks and
// the draft → NewCharacter conversion. Kept apart from builder.ts so step components can
// import it without a builder ↔ steps require cycle.
import type { Draft, NewCharacter } from '../types'
import { ABILITY_KEYS, STANDARD_ARRAY } from './definition'
import { getAbilityModifier, getMaxHP, getMaxSpellLevel, getSpellLimits, slotsFor } from './rules'

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

/**
 * Background bonuses are needed only when the background offers at least two abilities
 * (homebrew backgrounds may offer none); then +2 and +1 go to two different listed abilities.
 */
export function bonusesComplete(draft: Draft): boolean {
  const eligible = bonusAbilities(draft)
  if (eligible.length < 2) return true
  const two = str(draft.bg_bonus_two)
  const one = str(draft.bg_bonus_one)
  return eligible.includes(two) && eligible.includes(one) && two !== one
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

/** The class's starting equipment is chosen once an option is picked (trivially true with no options). */
export function equipmentComplete(draft: Draft): boolean {
  return strList(draft.class_equipment_options).length === 0 || typeof draft.equipment_option === 'number'
}

/** The class grants a Fighting Style at level 1 (cached from the class's level-1 features). */
export const hasFightingStyle = (draft: Draft): boolean => draft.class_fighting_style === true

/** A Fighting Style feat is chosen once picked (trivially true for classes without one). */
export function fightingStyleComplete(draft: Draft): boolean {
  return !hasFightingStyle(draft) || str(draft.fighting_style_id).length > 0
}

export const weaponMasteryCount = (draft: Draft): number => num(draft.class_mastery_count, 0)

/** Exactly the class's number of weapons is mastered (trivially true for a class without the feature). */
export function weaponMasteryComplete(draft: Draft): boolean {
  const ids = strList(draft.mastery_ids)
  return new Set(ids).size === weaponMasteryCount(draft) && ids.length === weaponMasteryCount(draft)
}

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
  const { maxCantrips, maxSpells } = getSpellLimits(str(draft.class_name), levelOf(draft))
  const { cantrips, spells, tooHigh } = spellCounts(draft)
  return !tooHigh && cantrips <= maxCantrips && spells <= maxSpells
}

/** Drops spells above the max spell level, then trims cantrips and spells to the limits (earliest picks kept). */
function fitSpells(draft: Draft): string[] {
  const cls = str(draft.class_name)
  const level = levelOf(draft)
  const max = getMaxSpellLevel(cls, level)
  const { maxCantrips, maxSpells } = getSpellLimits(cls, level)
  let cantrips = 0
  let spells = 0
  return strList(draft.spell_ids).filter((id) => {
    const lvl = spellLevel(draft, id) ?? 0
    if (lvl > max) return false
    if (lvl === 0) return ++cantrips <= maxCantrips
    return ++spells <= maxSpells
  })
}

/** True when the six abilities hold exactly the standard array (each value used once). */
export function abilitiesAssigned(draft: Draft): boolean {
  const values = ABILITY_KEYS.map((k) => draft[k])
  if (!values.every((v) => typeof v === 'number')) return false
  return [...(values as number[])].sort((a, b) => b - a).join() === [...STANDARD_ARRAY].sort((a, b) => b - a).join()
}

/**
 * Draft keys:
 * - class_id, class_name, hit_die (cached from the class pick), subclass_id, level
 * - species_id, background_id, bg_abilities (the background's eligible abilities, cached on pick),
 *   bg_skills (its granted skills, kebab-case, cached on pick)
 * - class_skill_count, class_skill_options (the class's skill picks, cached on the class pick) and
 *   class_skills (the picks)
 * - class_equipment_options (the class's option strings, cached on the class pick), equipment_option (index
 *   picked), equipment_items / equipment_other / equipment_gold (the picked option, resolved when chosen)
 * - class_fighting_style (the class has a level-1 Fighting Style, cached on the class pick) and
 *   fighting_style_id (the chosen feat)
 * - class_mastery_count (weapons the class masters, cached on the class pick) and mastery_ids (the picked
 *   weapon item ids)
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
    class_fighting_style: false,
    fighting_style_id: null,
    class_mastery_count: 0,
    mastery_ids: [],
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
 * - a background change clears the bonuses (and its cached ability list) unless the patch sets them;
 * - a class change resets the subclass, clears the class skill picks (unless the patch carries the new
 *   class's skill list) and drops spells off the new class list;
 * - a background or class change drops class skill picks the background now grants;
 * - a class or level change drops spells above the new max spell level and trims to the new limits.
 */
export function pruneDraft(draft: Draft, changed: Partial<Draft>): Draft {
  const next: Draft = { ...draft, ...changed }
  if ('background_id' in changed && changed.background_id !== draft.background_id) {
    if (!('bg_bonus_two' in changed)) next.bg_bonus_two = null
    if (!('bg_bonus_one' in changed)) next.bg_bonus_one = null
    if (!('bg_abilities' in changed)) next.bg_abilities = []
    if (!('bg_skills' in changed)) next.bg_skills = []
  }
  const classChanged = 'class_id' in changed && changed.class_id !== draft.class_id
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
    if (!('class_fighting_style' in changed)) next.class_fighting_style = false
    next.fighting_style_id = null
    if (!('class_mastery_count' in changed)) next.class_mastery_count = 0
    next.mastery_ids = []
  }
  else next.class_skills = validClassSkills(next)
  if (classChanged || levelChanged) next.spell_ids = fitSpells(next)
  return next
}

export function toCharacter(draft: Draft): NewCharacter {
  const level = levelOf(draft)
  const stats = Object.fromEntries(ABILITY_KEYS.map((k) => [k, Math.min(20, num(draft[k], 10) + bonusFor(draft, k))]))
  const hpMax = Math.max(1, getMaxHP(level, num(draft.hit_die, 8), getAbilityModifier(stats.constitution)))
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
      death_saves_success: { tiers: { '1': { max: 3, used: 0 } } },
      death_saves_failure: { tiers: { '1': { max: 3, used: 0 } } },
    },
    conditions: [],
    details: {
      ...(typeof draft.equipment_option === 'number' ? { gold: num(draft.equipment_gold, 0), other_gear: strList(draft.equipment_other) } : {}),
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
        ? [{ content_id: draft.class_id, kind: 'class', state: { skills: validClassSkills(draft), ...(weaponMasteryCount(draft) > 0 ? { mastery: strList(draft.mastery_ids) } : {}) }, acquired_at_level: 1 }]
        : []),
      ...(hasFightingStyle(draft) ? pick('feat', draft.fighting_style_id, 1) : []),
      ...pick('subclass', draft.subclass_id, level),
      ...pick('species', draft.species_id, 1),
      ...pick('background', draft.background_id, 1),
      ...strList(draft.spell_ids).map((id) => ({ content_id: id, kind: 'spell', state: { prepared: false }, acquired_at_level: level })),
    ],
  }
}
