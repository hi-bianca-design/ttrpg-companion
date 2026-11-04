import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useHomeData } from '@/features/home/useHomeData'
import { listCharacters } from '@/features/characters/characters.api'
import { listMyCampaigns } from '@/features/campaigns/campaigns.api'
import { getActiveSession } from '@/features/sessions/sessions.api'
import { getActiveCombat, getCombatOrder } from '@/features/combat/combat.api'

jest.mock('@/features/characters/characters.api', () => ({ listCharacters: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.api', () => ({ listMyCampaigns: jest.fn() }))
jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn() }))
jest.mock('@/features/combat/combat.api', () => ({ getActiveCombat: jest.fn(), getCombatOrder: jest.fn() }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
)

test('one failing session query leaves that campaign undefined and the rest intact', async () => {
  ;(listCharacters as jest.Mock).mockResolvedValue([{ id: 'ch1' }])
  ;(listMyCampaigns as jest.Mock).mockResolvedValue([{ id: 'c1' }, { id: 'c2' }])
  ;(getActiveSession as jest.Mock).mockImplementation((id: string) => (id === 'c1' ? Promise.reject(new Error('boom')) : Promise.resolve({ id: 's2' })))
  const { result } = renderHook(() => useHomeData(), { wrapper })
  await waitFor(() => expect(result.current.sessions.c2).toEqual({ id: 's2' }))
  expect(result.current.sessions.c1).toBeUndefined()
  expect(result.current.characters).toHaveLength(1)
  expect(result.current.isError).toBe(false)
})

test('turnCampaignIds lists campaigns whose active combat points at the viewer’s own row', async () => {
  ;(listCharacters as jest.Mock).mockResolvedValue([])
  ;(listMyCampaigns as jest.Mock).mockResolvedValue([{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }])
  ;(getActiveSession as jest.Mock).mockResolvedValue({ id: 's', in_combat: true })
  ;(getActiveCombat as jest.Mock).mockImplementation(async (id: string) => ({ id: `cb-${id}`, status: 'active', turn_entry_id: id === 'c3' ? null : `e-${id}` }))
  ;(getCombatOrder as jest.Mock).mockImplementation(async (cb: string) => [
    { id: `e-${cb.slice(3)}`, user_id: cb === 'cb-c1' ? 'me' : 'someone' },
  ])
  const { result } = renderHook(() => useHomeData(), { wrapper })
  await waitFor(() => expect(result.current.turnCampaignIds).toEqual(['c1']))
})

test('no combat or order queries for a campaign whose session is not in combat', async () => {
  ;(listCharacters as jest.Mock).mockResolvedValue([])
  ;(listMyCampaigns as jest.Mock).mockResolvedValue([{ id: 'c1' }])
  ;(getActiveSession as jest.Mock).mockResolvedValue({ id: 's', in_combat: false })
  ;(getActiveCombat as jest.Mock).mockClear()
  const { result } = renderHook(() => useHomeData(), { wrapper })
  await waitFor(() => expect(result.current.sessions.c1).toBeTruthy())
  expect(getActiveCombat).not.toHaveBeenCalled()
  expect(result.current.turnCampaignIds).toEqual([])
})
