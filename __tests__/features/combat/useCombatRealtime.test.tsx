import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { useCombatRealtime } from '@/features/combat/useCombatRealtime'
import { qk } from '@/lib/query-client'

type Binding = { type: string; filter: { event: string; schema: string; table: string; filter?: string }; cb: () => void }
type FakeChannel = { bindings: Binding[]; status?: (s: string) => void }
const channels: FakeChannel[] = []

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => {
      const ch: FakeChannel & { on: jest.Mock; subscribe: jest.Mock } = { bindings: [], on: jest.fn(), subscribe: jest.fn() }
      ch.on.mockImplementation((type: string, filter: Binding['filter'], cb: () => void) => { ch.bindings.push({ type, filter, cb }); return ch })
      ch.subscribe.mockImplementation((cb: (s: string) => void) => { ch.status = cb; return ch })
      channels.push(ch)
      return ch
    }),
    removeChannel: jest.fn(),
  },
}))

import { supabase } from '@/lib/supabase'

function setup(campaignId: string | undefined, enabled: boolean) {
  const client = makeTestQueryClient()
  client.setQueryData(qk.combat('camp1'), { id: 'cb1', campaign_id: 'camp1', status: 'active' })
  for (const key of [qk.session('camp1'), qk.combat('camp1'), qk.combatOrder('cb1'), qk.combatEntries('cb1')]) {
    client.setQueryData(key, client.getQueryData(key) ?? [])
  }
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(() => useCombatRealtime(campaignId, enabled), { wrapper })
  return { client, ...hook }
}

const invalidated = (client: ReturnType<typeof makeTestQueryClient>, key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated
const allInvalidated = (client: ReturnType<typeof makeTestQueryClient>) =>
  [qk.session('camp1'), qk.combat('camp1'), qk.combatOrder('cb1'), qk.combatEntries('cb1')].map((k) => invalidated(client, k))

beforeEach(() => {
  jest.clearAllMocks()
  channels.length = 0
})

test('binds exactly sessions UPDATE, combats INSERT and combats UPDATE, each filtered by campaign', () => {
  setup('camp1', true)
  expect(channels).toHaveLength(1)
  expect(channels[0].bindings.map((b) => [b.type, b.filter])).toEqual([
    ['postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: 'campaign_id=eq.camp1' }],
    ['postgres_changes', { event: 'INSERT', schema: 'public', table: 'combats', filter: 'campaign_id=eq.camp1' }],
    ['postgres_changes', { event: 'UPDATE', schema: 'public', table: 'combats', filter: 'campaign_id=eq.camp1' }],
  ])
})

test('never binds combat_entries, combat_order or DELETE (realtime is a signal, never a data feed)', () => {
  setup('camp1', true)
  for (const b of channels[0].bindings) {
    expect(b.filter.table).not.toBe('combat_entries')
    expect(b.filter.table).not.toBe('combat_order')
    expect(b.filter.event).not.toBe('DELETE')
    expect(b.filter.event).not.toBe('*')
  }
})

test.each([0, 1, 2])('an event on binding %i invalidates the session, combat, order and entries queries', (i) => {
  const { client } = setup('camp1', true)
  expect(allInvalidated(client)).toEqual([false, false, false, false])
  act(() => channels[0].bindings[i].cb())
  expect(allInvalidated(client)).toEqual([true, true, true, true])
})

test('subscribing, and recovering after a drop, invalidate the same queries', () => {
  const { client } = setup('camp1', true)
  act(() => channels[0].status!('SUBSCRIBED'))
  expect(allInvalidated(client)).toEqual([true, true, true, true])
  act(() => { for (const k of [qk.session('camp1'), qk.combatOrder('cb1'), qk.combatEntries('cb1')]) client.setQueryData(k, []); client.setQueryData(qk.combat('camp1'), { id: 'cb1', campaign_id: 'camp1', status: 'active' }) })
  expect(allInvalidated(client)).toEqual([false, false, false, false])
  act(() => channels[0].status!('CHANNEL_ERROR'))
  act(() => channels[0].status!('SUBSCRIBED'))
  expect(allInvalidated(client)).toEqual([true, true, true, true])
})

test('reports a dropped connection', () => {
  const { result } = setup('camp1', true)
  expect(result.current.connected).toBe(true)
  act(() => channels[0].status!('CHANNEL_ERROR'))
  expect(result.current.connected).toBe(false)
})

test.each([
  ['disabled (an invited member)', 'camp1', false],
  ['without a campaign id', undefined, true],
])('creates no channel when %s', (_name, campaignId, enabled) => {
  setup(campaignId, enabled)
  expect(supabase.channel).not.toHaveBeenCalled()
})

test('unmounting removes the channel', () => {
  const { unmount } = setup('camp1', true)
  unmount()
  expect(supabase.removeChannel).toHaveBeenCalledWith(channels[0])
})
