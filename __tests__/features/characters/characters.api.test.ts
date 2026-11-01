import {
  createCharacter, getCharacter, listCharacters, addItem, updateItem, removeItem, updateResources,
} from '@/features/characters/characters.api'
import type { NewCharacter } from '@/systems/types'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } },
}))

import { supabase } from '@/lib/supabase'

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
    const b = builder({ error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await updateResources('ch1', resources)
    expect(b.update).toHaveBeenCalledWith({ resources })
    expect(b.eq).toHaveBeenCalledWith('id', 'ch1')
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
