// D&D 5e (2024) languages: free text, stored on `details.languages`. Pure helpers, no React.
import type { CharacterRecord } from '../types'

const MAX_LENGTH = 40
const MAX_ENTRIES = 30

/** Languages a class always knows (lowercase class name). */
export const CLASS_LANGUAGES: Record<string, string[]> = {
  druid: ['Druidic'],
  rogue: ["Thieves' Cant"],
}

/** Trimmed, whitespace-collapsed, deduped (case-insensitive, first spelling kept), cut to length and count. */
export function normalizeLanguages(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of list) {
    if (typeof v !== 'string') continue
    const name = v.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH).trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length === MAX_ENTRIES) break
  }
  return out
}

/** "Elvish, Dwarvish" (or one per line) as a list. */
export function parseLanguageText(text: string): string[] {
  return normalizeLanguages(text.split(/[,\n]/))
}

/** What a new character knows: Common, the class's grants, species and background grants, then the player's picks. */
export function startingLanguages(input: { className: string; species: string[]; background: string[]; chosen: string[] }): string[] {
  const grants = CLASS_LANGUAGES[input.className.trim().toLowerCase()] ?? []
  return normalizeLanguages(['Common', ...grants, ...input.species, ...input.background, ...input.chosen])
}

/** The character's recorded languages, or null when none were ever recorded. */
export function characterLanguages(c: CharacterRecord): string[] | null {
  const v = c.details.languages
  return Array.isArray(v) ? normalizeLanguages(v) : null
}
