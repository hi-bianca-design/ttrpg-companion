import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { getPartyCharacters } from '@/features/party/party.api'
import { PARTY_REFRESH_MS, partyCharacterIds, usePartyCharacters } from '@/features/party/party.queries'

jest.mock('@/features/party/party.api', () => ({ getPartyCharacters: jest.fn() }))

const member = (user_id: string, over: object = {}) => ({
  campaign_id: 'camp1', user_id, role: 'player', status: 'active', character_id: null, created_at: '', updated_at: '',
  username: user_id, character_name: null, ...over,
})
const campaign = (members: object[]) => ({ id: 'camp1', gm_id: 'gm1', name: 'Odd Game', members }) as never

function setup() {
  const client = makeTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

beforeEach(() => jest.clearAllMocks())

describe('partyCharacterIds', () => {
  it('is the character ids of active members who have one', () => {
    const c = campaign([
      member('gm1', { role: 'gm' }),
      member('p1', { character_id: 'c1' }),
      member('p2', { character_id: 'c2' }),
      member('inv', { status: 'invited', character_id: 'c3' }),
      member('p3'),
    ])
    expect(partyCharacterIds(c)).toEqual(['c1', 'c2'])
  })

  it('is empty without a campaign', () => expect(partyCharacterIds(undefined)).toEqual([]))
})

describe('usePartyCharacters', () => {
  it('is disabled without a campaign', () => {
    const { wrapper } = setup()
    renderHook(() => usePartyCharacters(undefined), { wrapper })
    expect(getPartyCharacters).not.toHaveBeenCalled()
  })

  it('loads the active members’ characters', async () => {
    ;(getPartyCharacters as jest.Mock).mockResolvedValue([{ id: 'c1' }, { id: 'c2' }])
    const { wrapper } = setup()
    const { result } = renderHook(() => usePartyCharacters(campaign([member('p1', { character_id: 'c1' }), member('p2', { character_id: 'c2' })])), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'c1' }, { id: 'c2' }]))
    expect(getPartyCharacters).toHaveBeenCalledWith(['c1', 'c2'])
  })

  it('gives an empty party when nobody has a character', async () => {
    ;(getPartyCharacters as jest.Mock).mockResolvedValue([])
    const { wrapper } = setup()
    const { result } = renderHook(() => usePartyCharacters(campaign([member('gm1', { role: 'gm' })])), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([]))
  })

  it('loads again when the list of characters changes', async () => {
    ;(getPartyCharacters as jest.Mock).mockResolvedValue([])
    const { wrapper } = setup()
    const { rerender } = renderHook(({ c }: { c: never }) => usePartyCharacters(c), {
      wrapper, initialProps: { c: campaign([member('p1', { character_id: 'c1' })]) },
    })
    await waitFor(() => expect(getPartyCharacters).toHaveBeenCalledWith(['c1']))
    rerender({ c: campaign([member('p1', { character_id: 'c1' }), member('p2', { character_id: 'c2' })]) })
    await waitFor(() => expect(getPartyCharacters).toHaveBeenCalledWith(['c1', 'c2']))
  })

  it('refreshes derived values on a slow interval', () => expect(PARTY_REFRESH_MS).toBe(60_000))
})
