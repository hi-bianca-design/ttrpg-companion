import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { toCharacterFull } from '@/features/characters/characters.api'
import { usePartyRealtime } from '@/features/party/usePartyRealtime'
import { qk } from '@/lib/query-client'

type Handler = (payload: { new: Record<string, unknown> }) => void
const channels: { on: jest.Mock; subscribe: jest.Mock; handler?: Handler; status?: (s: string) => void }[] = []

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => {
      const ch: (typeof channels)[number] = { on: jest.fn(), subscribe: jest.fn() }
      ch.on.mockImplementation((_type: string, _filter: unknown, cb: Handler) => { ch.handler = cb; return ch })
      ch.subscribe.mockImplementation((cb: (s: string) => void) => { ch.status = cb; return ch })
      channels.push(ch)
      return ch
    }),
    removeChannel: jest.fn(),
  },
}))

import { supabase } from '@/lib/supabase'

const resources = {
  hp: { current: 20, max: 30 },
  spell_slots: { tiers: {} },
  hit_dice: { current: 1, max: 1 },
  death_saves_success: { tiers: { '1': { max: 3, used: 0 } } },
  death_saves_failure: { tiers: { '1': { max: 3, used: 0 } } },
}
const stats = { strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 }
const row = (id: string) => ({
  id, owner_id: 'u1', system_id: 'dnd5e-2024', name: `Hero ${id}`, level: 3, stats, resources, conditions: [], details: {},
  notes: null, portrait_url: null, character_picks: [], character_items: [],
}) as never

const member = (user_id: string, character_id: string | null, status = 'active') => ({
  campaign_id: 'camp1', user_id, role: 'player', status, character_id, created_at: '', updated_at: '', username: user_id, character_name: null,
})
const campaign = (members: object[]) => ({ id: 'camp1', gm_id: 'gm1', name: 'Odd Game', members }) as never

function setup(initial = campaign([member('p1', 'c1'), member('p2', 'c2')])) {
  const client = makeTestQueryClient()
  client.setQueryData([...qk.party('camp1'), 'c1,c2'], [toCharacterFull(row('c1')), toCharacterFull(row('c2'))])
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(({ c }: { c: never }) => usePartyRealtime(c), { wrapper, initialProps: { c: initial } })
  return { client, ...hook }
}

const cached = (client: ReturnType<typeof makeTestQueryClient>) =>
  client.getQueryData<ReturnType<typeof toCharacterFull>[]>([...qk.party('camp1'), 'c1,c2'])!

beforeEach(() => {
  jest.clearAllMocks()
  channels.length = 0
})

test('subscribes to updates of exactly the party’s characters', () => {
  setup()
  expect(supabase.channel).toHaveBeenCalledTimes(1)
  expect(channels[0].on).toHaveBeenCalledWith(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'characters', filter: 'id=in.(c1,c2)' },
    expect.any(Function),
  )
})

test('does not subscribe when nobody in the party has a character', () => {
  setup(campaign([member('p1', null)]))
  expect(supabase.channel).not.toHaveBeenCalled()
})

test('a change updates hit points and conditions in the cache and keeps derived values', () => {
  const { client } = setup()
  act(() => channels[0].handler!({ new: { id: 'c1', name: 'Mira', level: 4, stats, resources: { ...resources, hp: { current: 11, max: 30 } }, conditions: ['prone'], details: {} } }))
  const mira = cached(client).find((c) => c.id === 'c1')!
  expect(mira.name).toBe('Mira')
  expect(mira.level).toBe(4)
  expect(mira.conditions).toEqual(['prone'])
  expect((mira.resources.hp as { current: number }).current).toBe(11)
  expect(mira.derived.find((d) => d.key === 'ac')?.value).toBe(12)
  expect(cached(client).find((c) => c.id === 'c2')!.name).toBe('Hero c2')
})

test('a change for a character outside the party changes nothing', () => {
  const { client } = setup()
  const before = cached(client)
  act(() => channels[0].handler!({ new: { id: 'stranger', name: 'Nope', level: 1, stats, resources, conditions: [], details: {} } }))
  expect(cached(client)).toEqual(before)
})

test('a change that does not parse refetches instead of corrupting the cache', () => {
  const { client } = setup()
  const before = cached(client)
  act(() => channels[0].handler!({ new: { id: 'c1', name: 'Mira', level: 4, stats: { strength: 99 }, resources, conditions: [], details: {} } }))
  expect(cached(client)).toEqual(before)
  expect(client.getQueryState([...qk.party('camp1'), 'c1,c2'])?.isInvalidated).toBe(true)
})

test('a changed list of characters swaps the channel and its filter', () => {
  const { rerender } = setup()
  rerender({ c: campaign([member('p1', 'c1'), member('p2', 'c2'), member('p3', 'c3')]) })
  expect(supabase.removeChannel).toHaveBeenCalledWith(channels[0])
  expect(channels[1].on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ filter: 'id=in.(c1,c2,c3)' }), expect.any(Function))
})

test('unmounting removes the channel', () => {
  const { unmount } = setup()
  unmount()
  expect(supabase.removeChannel).toHaveBeenCalledWith(channels[0])
})

test('connection loss is reported, and recovery refetches the party', () => {
  const { client, result } = setup()
  expect(result.current.connected).toBe(true)
  act(() => channels[0].status!('CHANNEL_ERROR'))
  expect(result.current.connected).toBe(false)
  act(() => channels[0].status!('SUBSCRIBED'))
  expect(result.current.connected).toBe(true)
  expect(client.getQueryState([...qk.party('camp1'), 'c1,c2'])?.isInvalidated).toBe(true)
})

test('the first SUBSCRIBED is not a recovery: nothing is refetched', () => {
  const { client } = setup()
  act(() => channels[0].status!('SUBSCRIBED'))
  expect(client.getQueryState([...qk.party('camp1'), 'c1,c2'])?.isInvalidated).toBe(false)
})
