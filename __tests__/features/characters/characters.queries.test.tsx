import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useResourceMutation } from '@/features/characters/characters.queries'
import { updateResources } from '@/features/characters/characters.api'
import { qk } from '@/lib/query-client'
import { spendSlot } from '@/systems/resources'
import type { SlotsValue } from '@/systems/types'

jest.mock('@/features/characters/characters.api', () => ({
  updateResources: jest.fn(),
}))
jest.mock('@/lib/supabase', () => ({ supabase: {} }))

const mockUpdate = updateResources as jest.Mock

function seed(qc: QueryClient) {
  qc.setQueryData(qk.character('ch1'), {
    id: 'ch1',
    resources: { spell_slots: { tiers: { '1': { max: 4, used: 0 } } } },
  })
}
const used = (qc: QueryClient) =>
  ((qc.getQueryData(qk.character('ch1')) as { resources: { spell_slots: SlotsValue } }).resources.spell_slots.tiers['1'].used)

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: 0 } } })
  seed(qc)
  client = qc
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useResourceMutation('ch1'), { wrapper })
  return { qc, hook }
}

const spend = { key: 'spell_slots', apply: (v: unknown) => spendSlot(v as SlotsValue, '1') }

let client: QueryClient
beforeEach(() => jest.clearAllMocks())
afterEach(() => client.clear())

describe('useResourceMutation', () => {
  it('composes two rapid taps: used is incremented by 2 before either resolves', async () => {
    const resolvers: Array<() => void> = []
    mockUpdate.mockImplementation(() => new Promise<void>((r) => resolvers.push(r)))
    const { qc, hook } = setup()

    await act(async () => { hook.result.current.mutate(spend) })
    await act(async () => { hook.result.current.mutate(spend) })

    expect(used(qc)).toBe(2)
    // the second request persists the cumulative state
    expect(mockUpdate).toHaveBeenLastCalledWith('ch1', expect.objectContaining({
      spell_slots: { tiers: { '1': { max: 4, used: 2 } } },
    }))

    await act(async () => { resolvers.forEach((r) => r()) })
    expect(used(qc)).toBe(2)
  })

  it('rolls back to the previous cache when the write fails', async () => {
    mockUpdate.mockRejectedValue(new Error('boom'))
    const { qc, hook } = setup()
    await act(async () => { hook.result.current.mutate(spend) })
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(used(qc)).toBe(0)
  })
})
