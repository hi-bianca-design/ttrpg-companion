import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useHomeData } from '@/features/home/useHomeData'
import { listCharacters } from '@/features/characters/characters.api'
import { listMyCampaigns } from '@/features/campaigns/campaigns.api'
import { getActiveSession } from '@/features/sessions/sessions.api'

jest.mock('@/features/characters/characters.api', () => ({ listCharacters: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.api', () => ({ listMyCampaigns: jest.fn() }))
jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn() }))

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
