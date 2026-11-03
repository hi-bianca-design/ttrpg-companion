// Pure helpers for "make your own" class, species and background in the character wizard.
// No React, no network: defaults for empty extras, schema-valid data builders, the draft
// cache for a custom class, and name helpers.
import type { FieldDef } from '../types'
import { parseLanguageText } from './languages'
import { ABILITY_KEYS, DND_CONTENT_KIND_META, SKILLS } from './definition'

export type CustomKind = 'class' | 'species' | 'background'

export type CustomEntry = {
  name: string
  description: string
  library: boolean
  /** Keyed by field key; class also uses `skill_count` and `skill_from`. */
  extras: Record<string, unknown>
}

const SKILL_KEYS = SKILLS.map((s) => s.key)
const DEFAULT_HIT_DIE = 8
const DEFAULT_SPEED = 30
const DEFAULT_SIZE = 'Medium'
// creature_type is a top-level string in species `data` (as in the seed rows) and the
// schema requires it, so an empty form value falls back to the SRD norm.
const DEFAULT_CREATURE_TYPE = 'Humanoid'

/** The form fields for a kind, all optional; class also gets its skill-choice fields. */
export function customExtraFields(kind: CustomKind): FieldDef[] {
  const fields: FieldDef[] = DND_CONTENT_KIND_META[kind].fields.map((f) => ({ ...f, required: false }))
  if (kind === 'class') {
    fields.push(
      { key: 'skill_count', label: 'Skills to choose', type: 'number' },
      { key: 'skill_from', label: 'Skills to choose from', type: 'multiselect', options: [...SKILL_KEYS] },
    )
  }
  return fields
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : undefined
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/** Granted languages from a homebrew form's text; `Common` is implicit and left out. */
function languageGrants(v: unknown): { languages?: string[] } {
  const list = parseLanguageText(typeof v === 'string' ? v : '').filter((l) => l.toLowerCase() !== 'common')
  return list.length > 0 ? { languages: list } : {}
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function isAbility(v: unknown): v is (typeof ABILITY_KEYS)[number] {
  return typeof v === 'string' && (ABILITY_KEYS as readonly string[]).includes(v)
}

function hitDie(extras: Record<string, unknown>): number {
  const n = num(extras.hit_die)
  return n !== undefined && Number.isInteger(n) && n > 0 ? n : DEFAULT_HIT_DIE
}

/** Known skill keys (deduped, in order) and the count clamped to how many there are. */
function skillChoice(extras: Record<string, unknown>): { count: number; from: string[] } {
  const from = [...new Set(strList(extras.skill_from).filter((k) => SKILL_KEYS.includes(k)))]
  const n = num(extras.skill_count)
  const count = Math.min(Math.max(Math.floor(n ?? 0), 0), from.length)
  return { count, from }
}

export function customData(kind: CustomKind, extras: Record<string, unknown>, oneOff: boolean): unknown {
  const e = extras ?? {}
  const flag = oneOff ? { one_off: true } : {}
  if (kind === 'class') {
    const { count, from } = skillChoice(e)
    return {
      ...flag,
      hit_die: hitDie(e),
      primary_abilities: strList(e.primary_abilities),
      saving_throw_proficiencies: strList(e.saving_throw_proficiencies),
      ...(isAbility(e.spellcasting_ability) ? { spellcasting_ability: e.spellcasting_ability } : {}),
      features: count > 0 ? { skill_choices: { count, from } } : {},
    }
  }
  if (kind === 'species') {
    const speed = num(e.speed)
    return {
      ...flag,
      speed: speed !== undefined && Number.isInteger(speed) && speed >= 0 ? speed : DEFAULT_SPEED,
      size: text(e.size) || DEFAULT_SIZE,
      creature_type: text(e.creature_type) || DEFAULT_CREATURE_TYPE,
      traits: {},
      ability_score_bonuses: {},
      ...languageGrants(e.languages),
    }
  }
  const feat = text(e.origin_feat)
  const tool = text(e.tool_proficiency)
  return {
    ...flag,
    skill_proficiencies: strList(e.skill_proficiencies).filter((k) => SKILL_KEYS.includes(k)),
    ability_score_options: {},
    ...(feat ? { origin_feat: feat } : {}),
    ...(tool ? { tool_proficiency: tool } : {}),
    ...languageGrants(e.languages),
  }
}

/** The draft cache `ClassStep` fills for an official class, built from a custom one. */
export function cachedClassFields(entry: CustomEntry): {
  class_name: string
  hit_die: number
  class_skill_count: number
  class_skill_options: string[]
  class_features: string[]
  class_equipment_options: string[]
} {
  const { count, from } = skillChoice(entry.extras ?? {})
  return {
    class_name: cleanName(entry.name),
    hit_die: hitDie(entry.extras ?? {}),
    class_skill_count: count,
    class_skill_options: count > 0 ? from : [],
    class_features: [],
    class_equipment_options: [],
  }
}

export function collidesWithOfficial(name: string, officialNames: string[]): boolean {
  const n = name.trim().toLowerCase()
  return officialNames.some((o) => o.trim().toLowerCase() === n)
}

export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 80)
}
