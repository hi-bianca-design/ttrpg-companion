import {
  createCharacter, deleteCharacter, getCharacter, listCharacters, addItem, updateItem, removeItem, updateResources, levelUpCharacter, updateCharacter,
} from '@/features/characters/characters.api'
import type { NewCharacter } from '@/systems/types'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } },
}))

jest.mock('@/features/content/content.api', () => ({
  ...jest.requireActual('@/features/content/content.api'),
  saveHomebrew: jest.fn(),
  deleteHomebrew: jest.fn(),
}))

import { supabase } from '@/lib/supabase'
import { saveHomebrew, deleteHomebrew, slugify } from '@/features/content/content.api'

function builder(result: unknown) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'is', 'order']) b[m] = jest.fn(() => b)
  b.single = jest.fn(() => Promise.resolve(result))
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
  return b as Record<string, jest.Mock>
}

const resources = {
  hp: { current: 8, max: 8 },
  spell_slots: { tiers: {} },
  hit_dice: { current: 1, max: 1 },
  death_saves_success: { tiers: { '1': { max: 3, used: 0 } } },
  death_saves_failure: { tiers: { '1': { max: 3, used: 0 } } },
}
const stats = { strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 }

const newChar: NewCharacter = {
  system_id: 'dnd5e-2024', name: 'Ada', level: 1, stats, resources, conditions: [], details: {},
  picks: [{ content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1 }],
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
})

describe('createCharacter', () => {
  it('inserts the character then its picks and returns the id', async () => {
    const chars = builder({ data: { id: 'ch1' }, error: null })
    const picks = builder({ error: null })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : picks))
    await expect(createCharacter(newChar)).resolves.toBe('ch1')
    expect(chars.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: 'u1', name: 'Ada' }))
    expect(picks.insert).toHaveBeenCalledWith([
      { character_id: 'ch1', content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1 },
    ])
  })

  it('deletes the character when inserting picks fails', async () => {
    const chars = builder({ data: { id: 'ch1' }, error: null })
    const picks = builder({ error: { message: 'fk violation' } })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : picks))
    await expect(createCharacter(newChar)).rejects.toMatchObject({ code: 'unknown' })
    expect(chars.delete).toHaveBeenCalled()
    expect(chars.eq).toHaveBeenCalledWith('id', 'ch1')
  })
})

describe('createCharacter starting items', () => {
  it('inserts the starting items into character_items', async () => {
    const chars = builder({ data: { id: 'ch1' }, error: null })
    const rows = builder({ error: null })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : rows))
    await createCharacter({ ...newChar, items: [{ content_id: 'cm', quantity: 1, equipped: true }] })
    expect(supabase.from).toHaveBeenCalledWith('character_items')
    expect(rows.insert).toHaveBeenCalledWith([{ character_id: 'ch1', content_id: 'cm', quantity: 1, equipped: true }])
  })

  it('deletes the character when inserting items fails', async () => {
    const chars = builder({ data: { id: 'ch1' }, error: null })
    const ok = builder({ error: null })
    const bad = builder({ error: { message: 'fk violation' } })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : t === 'character_items' ? bad : ok))
    await expect(createCharacter({ ...newChar, items: [{ content_id: 'cm', quantity: 1, equipped: true }] })).rejects.toMatchObject({ code: 'unknown' })
    expect(chars.delete).toHaveBeenCalled()
  })
})

describe('getCharacter', () => {
  it('parses JSON via system schemas and feeds equipped items to derived values', async () => {
    const row = {
      id: 'ch1', owner_id: 'u1', system_id: 'dnd5e-2024', name: 'Ada', level: 1, stats, resources,
      conditions: [], details: {}, notes: null, portrait_url: null,
      character_picks: [
        { character_id: 'ch1', content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1, content: { id: 'cls', name: 'Rogue', kind: 'class', data: {} } },
      ],
      character_items: [
        {
          id: 'it1', character_id: 'ch1', content_id: 'arm', quantity: 1, equipped: true, attuned: false, notes: null,
          content: { id: 'arm', name: 'Chain Shirt', kind: 'item', data: { properties: { armor_class: '13 + Dex modifier (max 2)' } } },
        },
      ],
    }
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: row, error: null }))
    const c = await getCharacter('ch1')
    expect(c.name).toBe('Ada')
    expect(c.picks).toHaveLength(1)
    expect(c.items).toHaveLength(1)
    // DEX 14 => +2, chain shirt 13 capped at +2 => 15
    expect(c.derived.find((d) => d.key === 'ac')?.value).toBe(15)
  })

  it('rejects when stored stats do not match the system schema', async () => {
    const row = {
      id: 'ch1', owner_id: 'u1', system_id: 'dnd5e-2024', name: 'Ada', level: 1, stats: { strength: 99 }, resources,
      conditions: [], details: {}, notes: null, portrait_url: null, character_picks: [], character_items: [],
    }
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: row, error: null }))
    await expect(getCharacter('ch1')).rejects.toThrow()
  })
})

describe('listCharacters', () => {
  it('summarises class name and hp for the caller own characters', async () => {
    const b = builder({
      data: [{
        id: 'ch1', name: 'Ada', level: 3, system_id: 'dnd5e-2024', resources,
        character_picks: [{ kind: 'class', content: { name: 'Rogue' } }],
      }],
      error: null,
    })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    const list = await listCharacters()
    expect(b.eq).toHaveBeenCalledWith('owner_id', 'u1')
    expect(list).toEqual([
      { id: 'ch1', name: 'Ada', level: 3, system_id: 'dnd5e-2024', class_name: 'Rogue', hp: { current: 8, max: 8 } },
    ])
  })
})

describe('updates and items', () => {
  it('updateResources writes the resources column', async () => {
    const b = builder({ data: [{ id: 'ch1' }], error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await updateResources('ch1', resources)
    expect(b.update).toHaveBeenCalledWith({ resources })
    expect(b.eq).toHaveBeenCalledWith('id', 'ch1')
    expect(b.select).toHaveBeenCalledWith('id')
  })

  it('an update that matches no row (RLS-filtered or gone) is an error, not a silent success', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: [], error: null }))
    await expect(updateResources('ch1', resources)).rejects.toMatchObject({ code: 'save_failed' })
    await expect(updateCharacter('ch1', { name: 'X' })).rejects.toMatchObject({ code: 'save_failed' })
  })

  it('addItem / updateItem / removeItem hit character_items', async () => {
    const b = builder({ error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await addItem('ch1', 'arm', 2)
    expect(b.insert).toHaveBeenCalledWith({ character_id: 'ch1', content_id: 'arm', quantity: 2 })
    await updateItem('it1', { equipped: true })
    expect(b.update).toHaveBeenCalledWith({ equipped: true })
    await removeItem('it1')
    expect(b.delete).toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledWith('character_items')
  })
})

describe('deleteCharacter', () => {
  it('deletes the character row by id', async () => {
    const b = builder({ data: [{ id: 'ch1' }], error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await deleteCharacter('ch1')
    expect(supabase.from).toHaveBeenCalledWith('characters')
    expect(b.delete).toHaveBeenCalled()
    expect(b.eq).toHaveBeenCalledWith('id', 'ch1')
    expect(b.select).toHaveBeenCalledWith('id')
  })

  it('a delete that matches no row is an error', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: [], error: null }))
    await expect(deleteCharacter('ch1')).rejects.toMatchObject({ code: 'unknown' })
  })

  it('throws when the delete fails', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ error: { message: 'Network request failed' } }))
    await expect(deleteCharacter('ch1')).rejects.toBeTruthy()
  })
})

describe('levelUpCharacter', () => {
  const patch = { level: 3, resources, stats }

  it('inserts the subclass pick then updates level, resources and stats (ASI)', async () => {
    const chars = builder({ data: [{ id: 'ch1' }], error: null })
    const picks = builder({ error: null })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : picks))
    await levelUpCharacter('ch1', patch, { subclassId: 'sub1' })
    expect(picks.insert).toHaveBeenCalledWith({ character_id: 'ch1', content_id: 'sub1', kind: 'subclass', state: {}, acquired_at_level: 3 })
    expect(chars.update).toHaveBeenCalledWith(patch)
    expect(chars.eq).toHaveBeenCalledWith('id', 'ch1')
  })

  it('skips the pick when no subclass is chosen', async () => {
    const chars = builder({ data: [{ id: 'ch1' }], error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(chars)
    await levelUpCharacter('ch1', patch)
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('removes the pick again when the character update fails', async () => {
    const chars = builder({ error: { message: 'boom' } })
    const picks = builder({ error: null })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : picks))
    await expect(levelUpCharacter('ch1', patch, { subclassId: 'sub1' })).rejects.toBeTruthy()
    expect(picks.delete).toHaveBeenCalled()
    expect(picks.eq).toHaveBeenCalledWith('content_id', 'sub1')
  })

  it('does not touch the character when the pick insert fails', async () => {
    const chars = builder({ error: null })
    const picks = builder({ error: { message: 'dup' } })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : picks))
    await expect(levelUpCharacter('ch1', patch, { subclassId: 'sub1' })).rejects.toBeTruthy()
    expect(chars.update).not.toHaveBeenCalled()
  })
})

describe('createCharacter custom content', () => {
  const entry = (over: Record<string, unknown> = {}) => ({
    kind: 'class', name: 'Dread Knight', description: 'd', data: { one_off: true }, library: false,
    pick: { state: { skills: ['arcana'] }, acquired_at_level: 1 }, ...over,
  })
  const setup = (picksResult: unknown = { error: null }) => {
    const chars = builder({ data: { id: 'ch1' }, error: null })
    const rows = builder(picksResult)
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : rows))
    let n = 0
    ;(saveHomebrew as jest.Mock).mockImplementation(async (i: { kind: string }) => ({ id: `new${++n}`, kind: i.kind }))
    return { chars, rows }
  }

  it('saves the content row after the character and before the picks, then picks it', async () => {
    const { chars, rows } = setup()
    const order: string[] = []
    chars.insert.mockImplementation(() => { order.push('character'); return chars })
    ;(saveHomebrew as jest.Mock).mockImplementation(async () => { order.push('content'); return { id: 'new1' } })
    rows.insert.mockImplementation(() => { order.push('picks'); return rows })
    await createCharacter({ ...newChar, custom: [entry()] } as NewCharacter)
    expect(order).toEqual(['character', 'content', 'picks'])
    const arg = (saveHomebrew as jest.Mock).mock.calls[0][0]
    expect(arg).toMatchObject({ systemId: 'dnd5e-2024', kind: 'class', name: 'Dread Knight', description: 'd', data: { one_off: true } })
    expect(arg.slug).toMatch(new RegExp(`^${slugify('Dread Knight')}-[a-z0-9]{6}$`))
    expect(chars.insert.mock.calls[0][0]).not.toHaveProperty('custom')
    expect(rows.insert).toHaveBeenCalledWith([
      { character_id: 'ch1', content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1 },
      { character_id: 'ch1', content_id: 'new1', kind: 'class', state: { skills: ['arcana'] }, acquired_at_level: 1 },
    ])
  })

  it('passes a library entry data through without one_off', async () => {
    setup()
    await createCharacter({ ...newChar, custom: [entry({ library: true, data: {} })] } as NewCharacter)
    expect((saveHomebrew as jest.Mock).mock.calls[0][0].data).not.toHaveProperty('one_off')
  })

  it('gives two entries with the same name different slugs', async () => {
    setup()
    await createCharacter({ ...newChar, custom: [entry(), entry({ kind: 'species' })] } as NewCharacter)
    const [a, b] = (saveHomebrew as jest.Mock).mock.calls.map((c) => c[0].slug)
    expect(a).not.toBe(b)
  })

  it('removes the character, then the created rows, when the picks insert fails', async () => {
    const { chars } = setup({ error: { message: 'fk' } })
    const order: string[] = []
    chars.delete.mockImplementation(() => { order.push('character'); return chars })
    ;(deleteHomebrew as jest.Mock).mockImplementation(async () => { order.push('content') })
    await expect(createCharacter({ ...newChar, custom: [entry(), entry({ kind: 'species' })] } as NewCharacter)).rejects.toMatchObject({ code: 'unknown' })
    expect(order).toEqual(['character', 'content', 'content'])
    expect(deleteHomebrew).toHaveBeenCalledWith('new1')
    expect(deleteHomebrew).toHaveBeenCalledWith('new2')
  })

  it('cleans up the earlier rows and the character when a later content insert fails, surfacing the error', async () => {
    const { chars } = setup()
    const boom = new Error('duplicate')
    ;(saveHomebrew as jest.Mock).mockReset()
    ;(saveHomebrew as jest.Mock).mockResolvedValueOnce({ id: 'new1' }).mockRejectedValueOnce(boom)
    await expect(createCharacter({ ...newChar, custom: [entry(), entry({ kind: 'species' })] } as NewCharacter)).rejects.toBe(boom)
    expect(chars.delete).toHaveBeenCalled()
    expect(deleteHomebrew).toHaveBeenCalledTimes(1)
    expect(deleteHomebrew).toHaveBeenCalledWith('new1')
  })

  it('cleans up the created rows when the items insert fails', async () => {
    const chars = builder({ data: { id: 'ch1' }, error: null })
    const ok = builder({ error: null })
    const bad = builder({ error: { message: 'fk' } })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'characters' ? chars : t === 'character_items' ? bad : ok))
    ;(saveHomebrew as jest.Mock).mockResolvedValue({ id: 'new1' })
    await expect(createCharacter({ ...newChar, custom: [entry()], items: [{ content_id: 'cm', quantity: 1, equipped: true }] } as NewCharacter)).rejects.toMatchObject({ code: 'unknown' })
    expect(chars.delete).toHaveBeenCalled()
    expect(deleteHomebrew).toHaveBeenCalledWith('new1')
  })

  it('makes no content calls for official-only input', async () => {
    setup()
    await createCharacter(newChar)
    expect(saveHomebrew).not.toHaveBeenCalled()
    expect(deleteHomebrew).not.toHaveBeenCalled()
  })
})
