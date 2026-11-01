import { joinCampaign, createCampaign, getCampaign, listMyCampaigns } from '@/features/campaigns/campaigns.api'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } },
}))

import { supabase } from '@/lib/supabase'

function builder(result: unknown) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order']) b[m] = jest.fn(() => b)
  b.single = jest.fn(() => Promise.resolve(result))
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
  return b as Record<string, jest.Mock>
}

beforeEach(() => jest.clearAllMocks())

describe('joinCampaign', () => {
  it('calls the join_campaign rpc and returns the campaign id', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: 'camp1', error: null })
    await expect(joinCampaign('ABC123', 'ch1')).resolves.toBe('camp1')
    expect(supabase.rpc).toHaveBeenCalledWith('join_campaign', { p_code: 'ABC123', p_character_id: 'ch1' })
  })

  it.each(['invalid_code', 'already_member', 'system_mismatch', 'not_your_character'])(
    'maps P0001 %s to AppError',
    async (message) => {
      ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { code: 'P0001', message } })
      await expect(joinCampaign('X', 'ch1')).rejects.toMatchObject({ name: 'AppError', code: message })
    },
  )
})

describe('createCampaign', () => {
  it('calls create_campaign and returns the new id', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: { id: 'camp1', invite_code: 'ABC123' }, error: null })
    await expect(createCampaign({ name: 'Lost Mine', systemId: 'dnd5e-2024', description: 'd' })).resolves.toBe('camp1')
    expect(supabase.rpc).toHaveBeenCalledWith('create_campaign', {
      p_name: 'Lost Mine', p_system_id: 'dnd5e-2024', p_description: 'd',
    })
  })
})

describe('getCampaign', () => {
  it('flattens member profile username and character name', async () => {
    const row = {
      id: 'camp1', name: 'Lost Mine', system_id: 'dnd5e-2024', gm_id: 'u1', description: null, invite_code: 'ABC123',
      created_at: '', updated_at: '',
      campaign_members: [
        { campaign_id: 'camp1', user_id: 'u1', role: 'gm', status: 'active', character_id: null, created_at: '', updated_at: '', profiles: { username: 'dm' }, characters: null },
        { campaign_id: 'camp1', user_id: 'u2', role: 'player', status: 'active', character_id: 'ch1', created_at: '', updated_at: '', profiles: { username: 'pl' }, characters: { name: 'Ada' } },
      ],
    }
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: row, error: null }))
    const c = await getCampaign('camp1')
    expect(c.members.map((m) => [m.username, m.character_name])).toEqual([['dm', null], ['pl', 'Ada']])
  })
})

describe('listMyCampaigns', () => {
  it('returns campaigns with member counts', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({
      data: [{ id: 'camp1', name: 'Lost Mine', campaign_members: [{ count: 3 }] }], error: null,
    }))
    const list = await listMyCampaigns()
    expect(list[0]).toMatchObject({ id: 'camp1', member_count: 3 })
  })
})
