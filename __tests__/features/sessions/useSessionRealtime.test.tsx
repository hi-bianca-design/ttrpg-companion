import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { useSessionRealtime } from '@/features/sessions/useSessionRealtime'
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

function setup(campaignId: string | undefined) {
  const client = makeTestQueryClient()
  client.setQueryData(qk.session('camp1'), { id: 's1' })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(() => useSessionRealtime(campaignId), { wrapper })
  return { client, ...hook }
}

const stale = (client: ReturnType<typeof makeTestQueryClient>) => client.getQueryState(qk.session('camp1'))?.isInvalidated

beforeEach(() => {
  jest.clearAllMocks()
  channels.length = 0
})

test('binds sessions INSERT and UPDATE filtered by campaign, nothing else', () => {
  setup('camp1')
  expect(channels).toHaveLength(1)
  expect(channels[0].bindings.map((b) => [b.type, b.filter])).toEqual([
    ['postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions', filter: 'campaign_id=eq.camp1' }],
    ['postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: 'campaign_id=eq.camp1' }],
  ])
})

test.each([0, 1])('an event on binding %i invalidates the session query', (i) => {
  const { client } = setup('camp1')
  expect(stale(client)).toBe(false)
  act(() => channels[0].bindings[i].cb())
  expect(stale(client)).toBe(true)
})

test('subscribing, and recovering after a drop, invalidate the session query', () => {
  const { client } = setup('camp1')
  act(() => channels[0].status!('SUBSCRIBED'))
  expect(stale(client)).toBe(true)
  act(() => { client.setQueryData(qk.session('camp1'), { id: 's1' }) })
  expect(stale(client)).toBe(false)
  act(() => channels[0].status!('CHANNEL_ERROR'))
  act(() => channels[0].status!('SUBSCRIBED'))
  expect(stale(client)).toBe(true)
})

test('creates no channel without a campaign id', () => {
  setup(undefined)
  expect(supabase.channel).not.toHaveBeenCalled()
})

test('unmounting removes the channel', () => {
  const { unmount } = setup('camp1')
  unmount()
  expect(supabase.removeChannel).toHaveBeenCalledWith(channels[0])
})
