import {
  characterLanguages, normalizeLanguages, parseLanguageText, startingLanguages,
} from '@/systems/dnd5e-2024/languages'
import { customData } from '@/systems/dnd5e-2024/customEntries'
import { dnd5eContentSchemas, dnd5eDetailsSchema } from '@/systems/dnd5e-2024/schemas'
import type { CharacterRecord } from '@/systems/types'

const char = (details: Record<string, unknown>): CharacterRecord =>
  ({ id: 'c', system_id: 'dnd5e-2024', name: 'M', level: 1, stats: {}, resources: {}, conditions: [], details })

describe('normalizeLanguages', () => {
  it('trims, dedupes case-insensitively keeping the first spelling, drops blanks', () => {
    expect(normalizeLanguages(['  elvish ', 'Elvish', 'ELVISH', '', '   ', 'Dwarvish'])).toEqual(['elvish', 'Dwarvish'])
  })
  it('collapses inner whitespace', () => {
    expect(normalizeLanguages(['Deep   Speech'])).toEqual(['Deep Speech'])
  })
  it('cuts an entry to 40 characters', () => {
    expect(normalizeLanguages(['x'.repeat(200)])[0]).toHaveLength(40)
  })
  it('caps at 30 entries', () => {
    expect(normalizeLanguages(Array.from({ length: 40 }, (_, i) => `Lang${i}`))).toHaveLength(30)
  })
  it('returns [] for non-arrays and ignores non-strings', () => {
    expect(normalizeLanguages('Elvish')).toEqual([])
    expect(normalizeLanguages(['Elvish', 3, null])).toEqual(['Elvish'])
  })
})

describe('parseLanguageText', () => {
  it('splits on commas and newlines', () => {
    expect(parseLanguageText('Elvish,\nDwarvish')).toEqual(['Elvish', 'Dwarvish'])
  })
})

describe('startingLanguages', () => {
  const base = { className: 'Wizard', species: [], background: [], chosen: [] }
  it('puts Common first even when chosen lists it later', () => {
    expect(startingLanguages({ ...base, chosen: ['Elvish', 'Common'] })).toEqual(['Common', 'Elvish'])
  })
  it('adds class grants case-insensitively', () => {
    expect(startingLanguages({ ...base, className: 'DRUID' })).toEqual(['Common', 'Druidic'])
    expect(startingLanguages({ ...base, className: 'Rogue' })).toEqual(['Common', "Thieves' Cant"])
    expect(startingLanguages(base)).toEqual(['Common'])
  })
  it('merges species and background grants and dedupes', () => {
    expect(startingLanguages({ ...base, species: ['Sylvan'], background: ['sylvan', 'Orc'], chosen: ['Orc'] }))
      .toEqual(['Common', 'Sylvan', 'Orc'])
  })
})

describe('characterLanguages', () => {
  it('is null when unset or malformed', () => {
    expect(characterLanguages(char({}))).toBeNull()
    expect(characterLanguages(char({ languages: 'Elvish' }))).toBeNull()
  })
  it('is [] for an explicit empty list and normalised otherwise', () => {
    expect(characterLanguages(char({ languages: [] }))).toEqual([])
    expect(characterLanguages(char({ languages: ['Common', ' Elvish', 'elvish'] }))).toEqual(['Common', 'Elvish'])
  })
})

describe('schemas', () => {
  it('details accepts languages or none and rejects non-strings', () => {
    expect(dnd5eDetailsSchema.safeParse({}).success).toBe(true)
    expect(dnd5eDetailsSchema.safeParse({ languages: ['Common'] }).success).toBe(true)
    expect(dnd5eDetailsSchema.safeParse({ languages: [1] }).success).toBe(false)
  })
  it('species and background accept optional languages', () => {
    const sp = { speed: 30, size: 'Medium', creature_type: 'Humanoid' }
    const bg = { skill_proficiencies: [] }
    for (const [schema, base] of [[dnd5eContentSchemas.species, sp], [dnd5eContentSchemas.background, bg]] as const) {
      expect(schema.safeParse(base).success).toBe(true)
      expect(schema.safeParse({ ...base, languages: ['Sylvan'] }).success).toBe(true)
    }
  })
  it('customData reads comma separated languages for species and background', () => {
    for (const kind of ['species', 'background'] as const) {
      const d = customData(kind, { languages: 'Elvish, Sylvan , elvish' }, false) as Record<string, unknown>
      expect(d.languages).toEqual(['Elvish', 'Sylvan'])
      expect('languages' in (customData(kind, { languages: '  ' }, false) as object)).toBe(false)
      expect('languages' in (customData(kind, {}, false) as object)).toBe(false)
      expect(dnd5eContentSchemas[kind].safeParse(d).success).toBe(true)
    }
  })
})
