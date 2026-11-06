import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import * as api from '@/features/encounters/encounters.api'
import { useEncounters } from '@/features/encounters/encounters.queries'
import { qk } from '@/lib/query-client'

jest.mock('@/features/encounters/encounters.api', () => ({ listEncounters: jest.fn() }))

function setup() {
  const client = makeTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

beforeEach(() => jest.clearAllMocks())

describe('useEncounters', () => {
  it('does not fetch for a non-GM', () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useEncounters('camp1', false), { wrapper })
    expect(api.listEncounters).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('does not fetch without a campaign id', () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useEncounters(undefined, true), { wrapper })
    expect(api.listEncounters).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches for the GM and caches under qk.encounters(campaignId)', async () => {
    const rows = [{ id: 'enc1', enemies: [] }] as never
    ;(api.listEncounters as jest.Mock).mockResolvedValue(rows)
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useEncounters('camp1', true), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(rows))
    expect(api.listEncounters).toHaveBeenCalledWith('camp1')
    expect(client.getQueryData(qk.encounters('camp1'))).toEqual(rows)
  })
})
