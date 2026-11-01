import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useResourceMutation } from '@/features/characters/characters.queries'
import { updateResources } from '@/features/characters/characters.api'
import { qk } from '@/lib/query-client'
import { restoreSlot, spendSlot } from '@/systems/resources'
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

function setup(onError?: (e: unknown) => void) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: 0 } } })
  seed(qc)
  client = qc
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useResourceMutation('ch1', { onError }), { wrapper })
  return { qc, hook }
}

const spend = { key: 'spell_slots', apply: (v: unknown) => spendSlot(v as SlotsValue, '1') }

let client: QueryClient
beforeEach(() => jest.clearAllMocks())
afterEach(() => client.clear())

describe('useResourceMutation', () => {
  it('composes two rapid taps and serialises the writes so the last persisted value is cumulative', async () => {
    const resolvers: Array<() => void> = []
    mockUpdate.mockImplementation(() => new Promise<void>((r) => resolvers.push(r)))
    const { qc, hook } = setup()

    await act(async () => { hook.result.current.mutate(spend) })
    await act(async () => { hook.result.current.mutate(spend) })

    // optimistic cache already shows both taps, but only the first request is in flight
    expect(used(qc)).toBe(2)
    expect(mockUpdate).toHaveBeenCalledTimes(1)

    await act(async () => { resolvers[0]() })
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2))
    // the second request is built when it runs, so it carries both taps
    expect(mockUpdate).toHaveBeenLastCalledWith('ch1', expect.objectContaining({
      spell_slots: { tiers: { '1': { max: 4, used: 2 } } },
    }))

    await act(async () => { resolvers[1]() })
    expect(used(qc)).toBe(2)
  })

  it('rolls back to the previous cache when the write fails', async () => {
    mockUpdate.mockRejectedValue(new Error('boom'))
    const { qc, hook } = setup()
    await act(async () => { hook.result.current.mutate(spend) })
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(used(qc)).toBe(0)
  })

  it('surfaces the error of an earlier mutate call even when a later one was dispatched', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('first failed')).mockResolvedValue(undefined)
    const onError = jest.fn()
    const { hook } = setup(onError)
    await act(async () => { hook.result.current.mutate(spend) })
    await act(async () => { hook.result.current.mutate(spend) })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'first failed' })))
  })

  it('two rapid spendSlot applies add up to +2', async () => {
    mockUpdate.mockResolvedValue(undefined)
    const { qc, hook } = setup()
    await act(async () => { hook.result.current.mutate(spend); hook.result.current.mutate(spend) })
    expect(used(qc)).toBe(2)
  })

  it('spend with nothing available and restore at max are no-ops', async () => {
    mockUpdate.mockResolvedValue(undefined)
    const { qc, hook } = setup()
    await act(async () => { hook.result.current.mutate({ key: 'spell_slots', apply: (v) => restoreSlot(v as SlotsValue, '1') }) })
    expect(used(qc)).toBe(0)
    qc.setQueryData(qk.character('ch1'), { id: 'ch1', resources: { spell_slots: { tiers: { '1': { max: 1, used: 1 } } } } })
    await act(async () => { hook.result.current.mutate(spend) })
    expect(used(qc)).toBe(1)
  })

  it('applyAll changes several resources in a single write', async () => {
    mockUpdate.mockResolvedValue(undefined)
    const { qc, hook } = setup()
    qc.setQueryData(qk.character('ch1'), {
      id: 'ch1',
      resources: { hp: { current: 1, max: 9 }, spell_slots: { tiers: { '1': { max: 4, used: 3 } } } },
    })
    await act(async () => {
      hook.result.current.mutate({
        applyAll: (r) => ({ ...r, hp: { current: 9, max: 9 }, spell_slots: { tiers: { '1': { max: 4, used: 0 } } } }),
      })
    })
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1))
    expect(mockUpdate).toHaveBeenCalledWith('ch1', {
      hp: { current: 9, max: 9 },
      spell_slots: { tiers: { '1': { max: 4, used: 0 } } },
    })
  })
})
