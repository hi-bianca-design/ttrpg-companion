import { canCreate, initialDraft, pruneDraft, toCharacter } from '@/systems/dnd5e-2024/draft'
import { cachedClassFields, cleanName, collidesWithOfficial, type CustomEntry } from '@/systems/dnd5e-2024/customEntries'
import { dnd5eContentSchemas } from '@/systems/dnd5e-2024/schemas'
import { classChoicesFor } from '@/systems/dnd5e-2024/classChoices'
import { slotsFor } from '@/systems/dnd5e-2024/rules'
import { createCharacter } from '@/features/characters/characters.api'
import { listContent, slugify } from '@/features/content/content.api'
import type { Draft } from '@/systems/types'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } },
}))

jest.mock('@/features/content/content.api', () => ({
  ...jest.requireActual('@/features/content/content.api'),
  saveHomebrew: jest.fn(),
  deleteHomebrew: jest.fn(),
}))

import { supabase } from '@/lib/supabase'
import { saveHomebrew } from '@/features/content/content.api'

function builder(result: unknown) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'is', 'ilike', 'order', 'or']) b[m] = jest.fn(() => b)
  b.single = jest.fn(() => Promise.resolve(result))
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
  return b as Record<string, jest.Mock>
}

const entry = (name: string, extras: Record<string, unknown> = {}, library = false): CustomEntry => ({
  name, description: '', library, extras,
})

/** The patches the wizard sends: ClassStep.saveCustom and OriginStep's species / background saves. */
function customDraft(opts: { cls?: CustomEntry; species?: CustomEntry; background?: CustomEntry; name?: string } = {}): Draft {
  let d = initialDraft()
  const cls = opts.cls ?? entry('Shadow Dancer')
  d = pruneDraft(d, { class_custom: cls, class_id: null, ...cachedClassFields(cls) })
  d = pruneDraft(d, { species_custom: opts.species ?? entry('Moonfolk'), species_id: null })
  d = pruneDraft(d, { background_custom: opts.background ?? entry('Lamplighter'), background_id: null })
  return pruneDraft(d, { name: opts.name ?? 'Ada' })
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
})

describe('(a) all-custom draft', () => {
  it('can be created, gets HP from the default hit die and CON, and emits schema-valid custom entries', () => {
    const d = customDraft()
    expect(canCreate(d)).toBe(true)
    const out = toCharacter(d)
    expect(out.resources.hp).toEqual({ current: 8, max: 8 })
    expect(out.custom).toHaveLength(3)
    for (const c of out.custom!) {
      expect(() => dnd5eContentSchemas[c.kind as 'class' | 'species' | 'background'].parse(c.data)).not.toThrow()
    }
    expect(out.custom!.map((c) => c.kind)).toEqual(['class', 'species', 'background'])
    expect(out.picks.filter((p) => ['class', 'species', 'background'].includes(p.kind))).toEqual([])
  })

  it('adds the CON modifier to HP', () => {
    const d = pruneDraft(customDraft(), { constitution: 14 })
    expect(toCharacter(d).resources.hp).toEqual({ current: 10, max: 10 })
  })
})

describe('(b) createCharacter on the output', () => {
  function setup() {
    const chars = builder({ data: { id: 'ch1' }, error: null })
    const picks = builder({ error: null })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : picks))
    let n = 0
    ;(saveHomebrew as jest.Mock).mockImplementation(async () => ({ id: `row${++n}` }))
    return { chars, picks }
  }

  it('writes three one-off content rows, then picks pointing at them', async () => {
    const { chars, picks } = setup()
    const input = toCharacter(customDraft())
    await expect(createCharacter(input)).resolves.toBe('ch1')
    expect(chars.insert).toHaveBeenCalledTimes(1)
    const calls = (saveHomebrew as jest.Mock).mock.calls.map((c) => c[0])
    expect(calls.map((c) => c.kind)).toEqual(['class', 'species', 'background'])
    for (const c of calls) {
      expect(c.data.one_off).toBe(true)
      expect(c.slug.startsWith(`${slugify(c.name)}-`)).toBe(true)
    }
    expect(picks.insert).toHaveBeenCalledWith([
      { character_id: 'ch1', content_id: 'row1', kind: 'class', state: input.custom![0].pick.state, acquired_at_level: 1 },
      { character_id: 'ch1', content_id: 'row2', kind: 'species', state: {}, acquired_at_level: 1 },
      { character_id: 'ch1', content_id: 'row3', kind: 'background', state: {}, acquired_at_level: 1 },
    ])
  })

  it('library: true on the class drops the flag from that row only', async () => {
    setup()
    await createCharacter(toCharacter(customDraft({ cls: entry('Shadow Dancer', {}, true) })))
    const [cls, species, bg] = (saveHomebrew as jest.Mock).mock.calls.map((c) => c[0])
    expect(cls.data).not.toHaveProperty('one_off')
    expect(species.data.one_off).toBe(true)
    expect(bg.data.one_off).toBe(true)
  })
})

describe('(c) listContent one-off filter', () => {
  const FILTER = 'data->>one_off.is.null,data->>one_off.neq.true'

  it("applies to 'mine' and 'pickable', not 'official'", async () => {
    for (const scope of ['mine', 'pickable', 'official'] as const) {
      const content = builder({ data: [], error: null })
      const campaigns = builder({ data: [], error: null })
      ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'campaigns' ? campaigns : content))
      await listContent({ systemId: 'dnd5e-2024', kind: 'class', scope })
      if (scope === 'official') expect(content.or).not.toHaveBeenCalled()
      else expect(content.or).toHaveBeenCalledWith(FILTER)
    }
  })

  it('keeps rows with no flag (NULL) by construction', () => {
    expect(FILTER).toContain('is.null')
  })
})

describe('(d) custom → official → custom class', () => {
  it('leaves one pending class entry and a cache that follows the last choice', () => {
    const first = entry('First', { hit_die: 10, skill_count: 1, skill_from: ['stealth'] })
    const second = entry('Second', { hit_die: 6, skill_count: 2, skill_from: ['arcana', 'history', 'stealth'] })
    let d = pruneDraft(initialDraft(), { class_custom: first, class_id: null, ...cachedClassFields(first) })
    d = pruneDraft(d, { class_skills: ['stealth'], class_choices: { fighting_style: ['Defense'] } })
    // Official class pick, as ClassStep sends it.
    d = pruneDraft(d, { class_id: 'official-id', class_name: 'Wizard', hit_die: 6, class_skill_count: 2, class_skill_options: ['arcana', 'history'] })
    expect(d.class_custom).toBeNull()
    expect(d.class_skills).toEqual([])
    expect(d.class_choices).toEqual({})
    d = pruneDraft(d, { class_skills: ['arcana'] })
    d = pruneDraft(d, { class_custom: second, class_id: null, ...cachedClassFields(second) })
    expect(d.class_id).toBeNull()
    expect(d.class_custom).toEqual(second)
    expect(d.class_skills).toEqual([])
    expect(d.class_choices).toEqual({})
    expect(d.class_name).toBe('Second')
    expect(d.hit_die).toBe(6)
    expect(d.class_skill_count).toBe(2)
    expect(d.class_skill_options).toEqual(['arcana', 'history', 'stealth'])
    d = pruneDraft(d, { name: 'Ada' })
    const out = toCharacter(d)
    expect(out.custom!.filter((c) => c.kind === 'class')).toHaveLength(1)
    expect(out.picks.filter((p) => p.kind === 'class')).toEqual([])
  })
})

describe('(e) slugs', () => {
  it('differ for two custom classes with the same name', async () => {
    const chars = builder({ data: { id: 'ch1' }, error: null })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : builder({ error: null })))
    ;(saveHomebrew as jest.Mock).mockImplementation(async () => ({ id: 'r' }))
    const input = toCharacter(customDraft({ cls: entry('Twin') }))
    await createCharacter(input)
    await createCharacter(input)
    const slugs = (saveHomebrew as jest.Mock).mock.calls.filter((c) => c[0].kind === 'class').map((c) => c[0].slug)
    expect(slugs).toHaveLength(2)
    expect(slugs[0]).not.toBe(slugs[1])
    expect(slugs.every((s: string) => s.startsWith('twin-'))).toBe(true)
  })

  it('differ within one call for two entries of the same kind', async () => {
    const chars = builder({ data: { id: 'ch1' }, error: null })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : builder({ error: null })))
    ;(saveHomebrew as jest.Mock).mockImplementation(async () => ({ id: 'r' }))
    const base = toCharacter(customDraft({ cls: entry('Twin') }))
    await createCharacter({ ...base, custom: [base.custom![0], base.custom![0]] })
    const slugs = (saveHomebrew as jest.Mock).mock.calls.map((c) => c[0].slug)
    expect(slugs[0]).not.toBe(slugs[1])
  })
})

describe('(f) a padded, lower-case class name', () => {
  // Name-match principle: rule functions that switch on the class name match case-insensitively where they
  // already do (slotsFor lowercases, so a custom "caster"/"wizard" would get that class's slots). Lookups that
  // compare exactly (featuresFor's className === 'Fighter') do not, so a custom "fighter" gets no Second Wind.
  const d = customDraft({ cls: entry(' fighter ') })

  it('is cleaned, collides with the official name, and still lets the character be created', () => {
    expect(cleanName(' fighter ')).toBe('fighter')
    expect(collidesWithOfficial(' fighter ', ['Fighter'])).toBe(true)
    expect(d.class_name).toBe('fighter')
    expect(canCreate(d)).toBe(true)
    expect(toCharacter(d).custom![0].name).toBe('fighter')
  })

  it('matches case-insensitively where the rules already do, and not elsewhere', () => {
    expect(slotsFor('fighter', 1)).toEqual(slotsFor('Fighter', 1))
    expect(slotsFor('wizard', 1)).toEqual(slotsFor('Wizard', 1))
    expect(Object.keys(slotsFor('wizard', 1).tiers).length).toBeGreaterThan(0)
    expect(classChoicesFor('fighter', [])).toEqual(classChoicesFor('Fighter', []))
    // Observed: feature resources look the class up by exact name.
    expect(Object.keys(toCharacter(d).resources)).not.toContain('second_wind')
  })
})

describe('(g) custom class skill picks', () => {
  const cls = entry('Skirmisher', { skill_count: 2, skill_from: ['stealth', 'arcana'] })

  it('caches the count and options', () => {
    const d = customDraft({ cls })
    expect(d.class_skill_count).toBe(2)
    expect(d.class_skill_options).toEqual(['stealth', 'arcana'])
  })

  it('emits only valid class_skills in the pick state', () => {
    const d = pruneDraft(customDraft({ cls }), { class_skills: ['stealth', 'arcana', 'history'] })
    const c = toCharacter(d).custom!.find((x) => x.kind === 'class')!
    expect(c.pick.state.skills).toEqual(['stealth', 'arcana'])
    expect((c.data as { features: unknown }).features).toEqual({ skill_choices: { count: 2, from: ['stealth', 'arcana'] } })
  })
})
