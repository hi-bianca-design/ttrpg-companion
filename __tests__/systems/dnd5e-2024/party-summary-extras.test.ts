import { dnd5e2024 } from '@/systems/dnd5e-2024'
import type { CharacterRecord, PickRecord } from '@/systems/types'

const summary = dnd5e2024.rules.partySummary!

function character(over: Partial<CharacterRecord> = {}): CharacterRecord {
  return {
    id: 'c1', system_id: 'dnd5e-2024', name: 'Mira', level: 5,
    stats: { strength: 10, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 12, charisma: 10 },
    resources: { hp: { current: 20, max: 30, temp: 0 } },
    conditions: [], details: {}, ...over,
  }
}

const pick = (kind: string, name: string, data: unknown = {}): PickRecord =>
  ({ content_id: `${kind}-${name}`, kind, state: {}, acquired_at_level: 1, content: { name, data } })

const more = (c: CharacterRecord, picks: PickRecord[]) => summary(c, picks).more
const byKey = (items: { key: string; label: string; value: string }[]) => Object.fromEntries(items.map((i) => [i.key, i]))

test('a Wizard at level 5 with Intelligence 16 shows a spell save DC of 14', () => {
  expect(byKey(more(character(), [pick('class', 'Wizard')])).spell_save_dc).toEqual({ key: 'spell_save_dc', label: 'Spell save DC', value: '14' })
})

test('a Fighter has no spell save DC item at all', () => {
  expect(more(character(), [pick('class', 'Fighter')]).map((i) => i.key)).not.toContain('spell_save_dc')
})

test('a homebrew class shows a DC only when it names a spellcasting ability', () => {
  const withAbility = more(character({ stats: { ...character().stats, charisma: 14 } }), [pick('class', 'Mystic', { spellcasting_ability: 'charisma' })])
  expect(byKey(withAbility).spell_save_dc.value).toBe('13')
  expect(more(character(), [pick('class', 'Mystic', {})]).map((i) => i.key)).not.toContain('spell_save_dc')
})

test('two casting classes give two keyed, labelled items', () => {
  const items = more(character(), [pick('class', 'Wizard'), pick('class', 'Cleric')])
  const dcs = items.filter((i) => i.key.startsWith('spell_save_dc'))
  expect(dcs.map((i) => i.key)).toEqual(['spell_save_dc_wizard', 'spell_save_dc_cleric'])
  expect(dcs.map((i) => i.label)).toEqual(['Spell save DC (Wizard)', 'Spell save DC (Cleric)'])
})

test('languages are listed in order', () => {
  expect(byKey(more(character({ details: { languages: ['Common', 'Elvish'] } }), [])).languages).toEqual({ key: 'languages', label: 'Languages', value: 'Common, Elvish' })
})

test.each([['unset', {}], ['empty', { languages: [] }]])('%s languages show Not set', (_n, details) => {
  expect(byKey(more(character({ details }), [])).languages.value).toBe('Not set')
})

test('languages and the DC are never in the glance row', () => {
  const { glance } = summary(character({ details: { languages: ['Common'] } }), [pick('class', 'Wizard')])
  expect(glance.map((g) => g.key)).toEqual(['ac', 'passive_perception', 'speed'])
})

test('more keeps the documented order: darkvision, spell save DC, languages, inspiration', () => {
  const species = pick('species', 'Elf', { speed: 30, traits: { traits: [{ name: 'Darkvision', description: 'You have Darkvision with a range of 60 feet.' }] } })
  const keys = more(character({ details: { languages: ['Common'], inspiration: true } }), [species, pick('class', 'Wizard')]).map((i) => i.key)
  expect(keys).toEqual(['passive_insight', 'passive_investigation', 'darkvision', 'spell_save_dc', 'languages', 'inspiration'])
})
