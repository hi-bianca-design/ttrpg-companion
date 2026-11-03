import { dnd5eBuilder } from '@/systems/dnd5e-2024/builder'
import type { Draft } from '@/systems/types'

const { initialDraft, pruneDraft, toCharacter } = dnd5eBuilder
const draft = (patch: Draft = {}): Draft => ({ ...initialDraft(), class_id: 'c', class_name: 'Wizard', name: 'Mira', ...patch })
const langs = (d: Draft) => toCharacter(d).details.languages

test('initialDraft starts with empty language keys', () => {
  expect(initialDraft()).toMatchObject({ languages_chosen: [], species_languages: [], bg_languages: [] })
})

test('toCharacter writes Common plus the chosen languages', () => {
  expect(langs(draft({ languages_chosen: ['Elvish', 'Dwarvish'] }))).toEqual(['Common', 'Elvish', 'Dwarvish'])
  expect(langs(draft())).toEqual(['Common'])
})

test('a Druid also gets Druidic, and changing class removes it', () => {
  const druid = draft({ class_name: 'Druid', languages_chosen: ['Elvish'] })
  expect(langs(druid)).toEqual(['Common', 'Druidic', 'Elvish'])
  expect(langs({ ...druid, class_name: 'Wizard' })).toEqual(['Common', 'Elvish'])
})

test('cached species and background grants are included', () => {
  expect(langs(draft({ species_languages: ['Sylvan'], bg_languages: ['Orc'] }))).toEqual(['Common', 'Sylvan', 'Orc'])
})

test('changing species or background resets its cached grants unless the patch sets them', () => {
  const d = draft({ species_id: 'a', species_languages: ['Sylvan'], background_id: 'b', bg_languages: ['Orc'] })
  expect(pruneDraft(d, { species_id: 'c' })).toMatchObject({ species_languages: [], bg_languages: ['Orc'] })
  expect(pruneDraft(d, { species_id: 'c', species_languages: ['Giant'] }).species_languages).toEqual(['Giant'])
  expect(pruneDraft(d, { background_id: 'e' })).toMatchObject({ bg_languages: [], species_languages: ['Sylvan'] })
})

test('a custom species or background reads its languages from its extras', () => {
  const entry = (extras: Record<string, unknown>) => ({ name: 'Moonkin', description: '', library: false, extras })
  const d = pruneDraft(initialDraft(), { species_custom: entry({ languages: 'Sylvan, Elvish' }), background_custom: entry({ languages: 'Orc' }) })
  expect(d).toMatchObject({ species_languages: ['Sylvan', 'Elvish'], bg_languages: ['Orc'] })
  expect(pruneDraft(d, { species_custom: null }).species_languages).toEqual([])
  expect(pruneDraft(initialDraft(), { species_custom: entry({}) }).species_languages).toEqual([])
})

test('chosen languages survive class, species and background changes', () => {
  const d = draft({ languages_chosen: ['Elvish'], species_id: 'a', background_id: 'b' })
  expect(pruneDraft(d, { class_id: 'x', species_id: 'y', background_id: 'z' }).languages_chosen).toEqual(['Elvish'])
})

test('a draft from before these keys existed still builds', () => {
  const old = draft()
  delete old.languages_chosen; delete old.species_languages; delete old.bg_languages
  expect(langs(old)).toEqual(['Common'])
})
