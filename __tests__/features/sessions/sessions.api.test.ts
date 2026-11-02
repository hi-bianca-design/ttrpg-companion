import { endSession, endTurn, getActiveSession, openSession, setCombat, setTurn } from '@/features/sessions/sessions.api'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}))

import { supabase } from '@/lib/supabase'

const session = { id: 's1', campaign_id: 'c1', status: 'active', in_combat: false, current_turn_user_id: null }

function builder(result: unknown) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq']) b[m] = jest.fn(() => b)
  b.maybeSingle = jest.fn(() => Promise.resolve(result))
  return b as Record<string, jest.Mock>
}

beforeEach(() => jest.clearAllMocks())

describe('session rpc wrappers', () => {
  it.each([
    ['openSession', () => openSession('c1'), 'open_session', { p_campaign_id: 'c1' }],
    ['endSession', () => endSession('s1'), 'end_session', { p_session_id: 's1' }],
    ['setCombat', () => setCombat('s1', true), 'set_combat', { p_session_id: 's1', p_in_combat: true }],
    ['setTurn', () => setTurn('s1', 'u2'), 'set_turn', { p_session_id: 's1', p_user_id: 'u2' }],
    ['setTurn (clear)', () => setTurn('s1', null), 'set_turn', { p_session_id: 's1', p_user_id: null }],
    ['endTurn', () => endTurn('s1'), 'end_turn', { p_session_id: 's1' }],
  ])('%s calls the rpc and returns the session', async (_name, call, fn, args) => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: session, error: null })
    await expect(call()).resolves.toEqual(session)
    expect(supabase.rpc).toHaveBeenCalledWith(fn, args)
  })

  it.each(['not_member', 'no_active_session', 'not_allowed', 'not_in_combat', 'invalid_turn_target', 'not_your_turn'])(
    'maps P0001 %s to AppError',
    async (message) => {
      ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { code: 'P0001', message } })
      await expect(setTurn('s1', 'u2')).rejects.toMatchObject({ name: 'AppError', code: message })
    },
  )
})

describe('getActiveSession', () => {
  it('selects the campaign’s active session', async () => {
    const b = builder({ data: session, error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await expect(getActiveSession('c1')).resolves.toEqual(session)
    expect(supabase.from).toHaveBeenCalledWith('sessions')
    expect(b.eq).toHaveBeenCalledWith('campaign_id', 'c1')
    expect(b.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('returns null when there is no active session', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: null, error: null }))
    await expect(getActiveSession('c1')).resolves.toBeNull()
  })
})
