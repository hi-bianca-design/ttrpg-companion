// D&D 5e (2024) character builder: step declarations, draft lifecycle and the
// draft → NewCharacter conversion. Step components are placeholders until Task 13.
import type { BuilderStepDef, Draft, GameSystem, NewCharacter } from '../types'
import { ABILITY_KEYS } from './definition'
import { getAbilityModifier, getMaxHP, slotsFor } from './rules'

const Placeholder: BuilderStepDef['component'] = () => null

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function levelOf(draft: Draft): number {
  return Math.min(20, Math.max(1, num(draft.level, 1)))
}

function hasSlots(draft: Draft): boolean {
  return Object.keys(slotsFor(str(draft.class_name), levelOf(draft)).tiers).length > 0
}

/**
 * Draft keys:
 * - class_id, class_name, hit_die (cached from the class pick), subclass_id, level
 * - species_id, background_id
 * - the six ability keys, bg_bonus_two / bg_bonus_one (ability keys receiving +2 / +1)
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
    ...Object.fromEntries(ABILITY_KEYS.map((k) => [k, 10])),
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

/** Merges `changed` into `draft`; a class change resets the subclass and drops spells off the new class list. */
export function pruneDraft(draft: Draft, changed: Partial<Draft>): Draft {
  const next: Draft = { ...draft, ...changed }
  if (!('class_id' in changed) || changed.class_id === draft.class_id) return next

  const cls = str(next.class_name).toLowerCase()
  const lists = (next.spell_classes ?? {}) as Record<string, string[]>
  next.subclass_id = null
  next.spell_ids = strList(next.spell_ids).filter((id) => strList(lists[id]).map((c) => c.toLowerCase()).includes(cls))
  return next
}

export function toCharacter(draft: Draft): NewCharacter {
  const level = levelOf(draft)
  const stats = Object.fromEntries(ABILITY_KEYS.map((k) => {
    const bonus = draft.bg_bonus_two === k ? 2 : draft.bg_bonus_one === k ? 1 : 0
    return [k, Math.min(20, num(draft[k], 10) + bonus)]
  }))
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

const steps: BuilderStepDef[] = [
  { id: 'class', title: 'Class', component: Placeholder, isComplete: (d) => !!d.class_id },
  { id: 'origin', title: 'Origin', component: Placeholder, isComplete: (d) => !!d.species_id && !!d.background_id },
  {
    id: 'ability-scores', title: 'Ability Scores', component: Placeholder,
    isComplete: (d) => !!d.bg_bonus_two && !!d.bg_bonus_one && d.bg_bonus_two !== d.bg_bonus_one,
  },
  { id: 'spells', title: 'Spells', component: Placeholder, isComplete: () => true, skip: (d) => !hasSlots(d) },
  { id: 'details', title: 'Details', component: Placeholder, isComplete: (d) => str(d.name).trim().length > 0 },
  { id: 'personality', title: 'Personality', component: Placeholder, isComplete: () => true },
  { id: 'review', title: 'Review', component: Placeholder, isComplete: () => true },
]

export const dnd5eBuilder: GameSystem['builder'] = { steps, initialDraft, pruneDraft, toCharacter }
