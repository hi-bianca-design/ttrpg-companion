import { deleteEncounter, listEncounters, saveEncounter, type EncounterInput } from '@/features/encounters/encounters.api'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}))

import { supabase } from '@/lib/supabase'

function mockSelect(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn(() => chain)
  chain.eq = jest.fn(() => chain)
  chain.order = jest.fn(() => Promise.resolve(result))
  ;(supabase.from as jest.Mock).mockReturnValue(chain)
  return chain
}

const input: EncounterInput = {
  name: 'Ambush', storyBefore: 'b', storyWhy: null, storyAfter: null,
  enemies: [{ name: 'Wolf', count: 2, max_hp: 11, defense_label: 'AC', ac: 13, xp: null, notes: null, hidden: false, attacks: [] }],
}

beforeEach(() => jest.clearAllMocks())

describe('listEncounters', () => {
  it('selects the campaign\'s encounters with nested enemies, ordered by created_at and position', async () => {
    const rows = [{ id: 'enc1', campaign_id: 'camp1', name: 'Wolves', encounter_enemies: [{ id: 'en1', position: 1 }] }]
    const chain = mockSelect({ data: rows, error: null })
    const out = await listEncounters('camp1')
    expect(supabase.from).toHaveBeenCalledWith('encounters')
    expect(chain.select).toHaveBeenCalledWith('*, encounter_enemies(*)')
    expect(chain.eq).toHaveBeenCalledWith('campaign_id', 'camp1')
    expect(chain.order).toHaveBeenCalledWith('created_at')
    expect(out).toEqual([{ id: 'enc1', campaign_id: 'camp1', name: 'Wolves', enemies: [{ id: 'en1', position: 1 }] }])
  })

  it('sorts each encounter\'s enemies by position', async () => {
    mockSelect({
      data: [{ id: 'enc1', encounter_enemies: [{ id: 'b', position: 2 }, { id: 'a', position: 1 }, { id: 'c', position: 3 }] }],
      error: null,
    })
    const [enc] = await listEncounters('camp1')
    expect(enc.enemies.map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('throws through unwrap on a database error', async () => {
    mockSelect({ data: null, error: { message: 'boom', code: 'XX000', details: '', hint: '' } })
    await expect(listEncounters('camp1')).rejects.toBeDefined()
  })
})

describe('saveEncounter', () => {
  it('creates through save_encounter with a null encounter id and returns the new id', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: 'enc1', error: null })
    await expect(saveEncounter('camp1', input)).resolves.toBe('enc1')
    expect(supabase.rpc).toHaveBeenCalledWith('save_encounter', {
      p_campaign_id: 'camp1', p_encounter_id: null, p_name: 'Ambush',
      p_story_before: 'b', p_story_why: null, p_story_after: null, p_enemies: input.enemies,
    })
  })
  it('replaces by passing the encounter id', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: 'enc9', error: null })
    await saveEncounter('camp1', input, 'enc9')
    expect(supabase.rpc).toHaveBeenCalledWith('save_encounter', expect.objectContaining({ p_encounter_id: 'enc9' }))
  })
  it.each(['not_allowed', 'invalid_encounter', 'invalid_enemy'])('maps P0001 %s to an AppError', async (message) => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { code: 'P0001', message } })
    await expect(saveEncounter('camp1', input)).rejects.toMatchObject({ name: 'AppError', code: message })
  })
})

describe('deleteEncounter', () => {
  it('deletes the row by id', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null })
    const del = jest.fn(() => ({ eq }))
    ;(supabase.from as jest.Mock).mockReturnValue({ delete: del })
    await deleteEncounter('enc1')
    expect(supabase.from).toHaveBeenCalledWith('encounters')
    expect(eq).toHaveBeenCalledWith('id', 'enc1')
  })
  it('throws the mapped error', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({ delete: () => ({ eq: () => Promise.resolve({ error: { message: 'Failed to fetch' } }) }) })
    await expect(deleteEncounter('enc1')).rejects.toMatchObject({ code: 'network' })
  })
})
