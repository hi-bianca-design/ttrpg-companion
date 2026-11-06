import { listEncounters } from '@/features/encounters/encounters.api'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
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
