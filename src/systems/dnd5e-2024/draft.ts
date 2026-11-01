// D&D 5e (2024) builder draft: initial values, pruning on change, completeness checks and
// the draft → NewCharacter conversion. Kept apart from builder.ts so step components can
// import it without a builder ↔ steps require cycle.
import type { Draft, NewCharacter } from '../types'
import { ABILITY_KEYS, STANDARD_ARRAY } from './definition'
import { getAbilityModifier, getMaxHP, slotsFor } from './rules'

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

/** True when the six abilities hold exactly the standard array (each value used once). */
export function abilitiesAssigned(draft: Draft): boolean {
  const values = ABILITY_KEYS.map((k) => draft[k])
  if (!values.every((v) => typeof v === 'number')) return false
  return [...(values as number[])].sort((a, b) => b - a).join() === [...STANDARD_ARRAY].sort((a, b) => b - a).join()
}

/**
 * Draft keys:
 * - class_id, class_name, hit_die (cached from the class pick), subclass_id, level
 * - species_id, background_id
 * - the six ability keys (null until assigned from the standard array),
 *   bg_bonus_two / bg_bonus_one (ability keys receiving +2 / +1)
 * - spell_ids, spell_classes (spell id → lowercase class list, cached by the spells step
 *   so pruneDraft can stay pure)
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
    ...Object.fromEntries(ABILITY_KEYS.map((k) => [k, null])),
    bg_bonus_two: null,
    bg_bonus_one: null,
    spell_ids: [],
    spell_classes: {},
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
 * Merges `changed` into `draft`. A class change resets the subclass and drops spells off the
 * new class list; a background change clears the background ability bonuses (unless the
 * same patch sets them).
 */
export function pruneDraft(draft: Draft, changed: Partial<Draft>): Draft {
  const next: Draft = { ...draft, ...changed }
  if ('background_id' in changed && changed.background_id !== draft.background_id) {
    if (!('bg_bonus_two' in changed)) next.bg_bonus_two = null
    if (!('bg_bonus_one' in changed)) next.bg_bonus_one = null
  }
  if (!('class_id' in changed) || changed.class_id === draft.class_id) return next

  const cls = str(next.class_name).toLowerCase()
  const lists = (next.spell_classes ?? {}) as Record<string, string[]>
  next.subclass_id = null
  next.spell_ids = strList(next.spell_ids).filter((id) => strList(lists[id]).map((c) => c.toLowerCase()).includes(cls))
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
      alignment: str(draft.alignment),
      personality_trait: str(draft.personality_trait),
      ideal: str(draft.ideal),
      bond: str(draft.bond),
      flaw: str(draft.flaw),
      appearance: str(draft.appearance),
      backstory: str(draft.backstory),
    },
    picks: [
      ...pick('class', draft.class_id, 1),
      ...pick('subclass', draft.subclass_id, level),
      ...pick('species', draft.species_id, 1),
      ...pick('background', draft.background_id, 1),
      ...strList(draft.spell_ids).map((id) => ({ content_id: id, kind: 'spell', state: { prepared: false }, acquired_at_level: level })),
    ],
  }
}
