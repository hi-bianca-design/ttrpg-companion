// Daggerheart builder draft: initial values, the create gate and the draft → NewCharacter
// conversion. Every choice is typed text (no Daggerheart content is seeded yet), so nothing
// depends on anything else and pruneDraft is a plain merge.
import type { Draft, NewCharacter } from '../types'
import { DH_STATS, HOPE_MAX, TRAIT_KEYS } from './definition'

export const str = (v: unknown): string => (typeof v === 'string' ? v : '')
export const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : fallback)

/**
 * Level 1 starting values. Stress (6) and Hope (2 of 6) are fixed by the core rules; HP and Evasion
 * come from the class and Armor from the armor you pick, so those three are editable defaults.
 */
export const DH_DEFAULTS = { hp: 6, armor: 3, evasion: 10, stress: 6, hope: 2 } as const

/** The core rules' trait modifiers, in TRAIT_KEYS order. */
export const SUGGESTED_TRAITS = [2, 1, 1, 0, 0, -1] as const

export const TRAIT_MIN = DH_STATS[0].min
export const TRAIT_MAX = DH_STATS[0].max

export const clampTrait = (n: number): number => Math.min(TRAIT_MAX, Math.max(TRAIT_MIN, n))

/** The suggested array as a draft patch. */
export function suggestedTraits(): Record<typeof TRAIT_KEYS[number], number> {
  return Object.fromEntries(TRAIT_KEYS.map((k, i) => [k, SUGGESTED_TRAITS[i]])) as Record<typeof TRAIT_KEYS[number], number>
}

/** Trimmed, non-empty entries. */
const filled = (v: unknown): string[] => strList(v).map((s) => s.trim()).filter((s) => s !== '')

/**
 * Draft keys: ancestry, community, class_name, subclass_name (typed text); domain_cards (up to two
 * typed names); the six trait keys (numbers, default 0); hp_max, armor_max, evasion (numbers, or
 * null when cleared, which falls back to the default); name, experiences (two strings), backstory.
 */
export function initialDraft(): Draft {
  return {
    ancestry: '',
    community: '',
    class_name: '',
    subclass_name: '',
    domain_cards: [],
    ...Object.fromEntries(TRAIT_KEYS.map((k) => [k, 0])),
    hp_max: DH_DEFAULTS.hp,
    armor_max: DH_DEFAULTS.armor,
    evasion: DH_DEFAULTS.evasion,
    name: '',
    experiences: [],
    backstory: '',
  }
}

export function pruneDraft(draft: Draft, changed: Partial<Draft>): Draft {
  return { ...draft, ...changed }
}

/** The only gate on Create: a class and a name. */
export function canCreate(draft: Draft): boolean {
  return str(draft.class_name).trim() !== '' && str(draft.name).trim() !== ''
}

/** Traits are "filled in" once any of them is set away from 0. */
export const traitsSet = (draft: Draft): boolean => TRAIT_KEYS.some((k) => num(draft[k], 0) !== 0)

const slots = (max: number) => ({ tiers: { '1': { max, used: 0 } } })

export function toCharacter(draft: Draft): NewCharacter {
  const text = (key: string) => str(draft[key]).trim()
  return {
    system_id: 'daggerheart',
    name: text('name'),
    level: 1,
    stats: Object.fromEntries(TRAIT_KEYS.map((k) => [k, clampTrait(num(draft[k], 0))])),
    resources: {
      hp: slots(Math.max(0, num(draft.hp_max, DH_DEFAULTS.hp))),
      stress: slots(DH_DEFAULTS.stress),
      armor: slots(Math.max(0, num(draft.armor_max, DH_DEFAULTS.armor))),
      hope: { current: DH_DEFAULTS.hope, max: HOPE_MAX },
    },
    conditions: [],
    details: {
      evasion: Math.max(0, num(draft.evasion, DH_DEFAULTS.evasion)),
      experiences: filled(draft.experiences),
      ancestry: text('ancestry'),
      community: text('community'),
      class_name: text('class_name'),
      subclass_name: text('subclass_name'),
      domain_cards: filled(draft.domain_cards).slice(0, 2),
      backstory: text('backstory'),
    },
    picks: [],
  }
}
