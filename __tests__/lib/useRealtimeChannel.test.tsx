import { act, renderHook } from '@testing-library/react-native'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useRealtimeChannel } from '@/lib/useRealtimeChannel'

type FakeChannel = { on: jest.Mock; subscribe: jest.Mock; status?: (s: string) => void }
const topics: string[] = []
const channels: FakeChannel[] = []

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn((topic: string) => {
      topics.push(topic)
      const ch: FakeChannel = { on: jest.fn(), subscribe: jest.fn() }
      ch.on.mockImplementation(() => ch)
      ch.subscribe.mockImplementation((cb: (s: string) => void) => { ch.status = cb; return ch })
      channels.push(ch)
      return ch
    }),
    removeChannel: jest.fn(),
  },
}))

import { supabase } from '@/lib/supabase'

const bind = (ch: RealtimeChannel) => ch
function setup(topic: string | null = 'topic:a', onSubscribed = jest.fn()) {
  const hook = renderHook(({ t }: { t: string | null }) => useRealtimeChannel({ topic: t, bind, onSubscribed }), { initialProps: { t: topic } })
  return { onSubscribed, ...hook }
}

beforeEach(() => {
  jest.clearAllMocks()
  channels.length = 0
  topics.length = 0
})

test('is connected before anything happens and does nothing for a null topic', () => {
  const { result } = setup(null)
  expect(result.current.connected).toBe(true)
  expect(supabase.channel).not.toHaveBeenCalled()
})

test.each(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'])('%s reports disconnected, SUBSCRIBED reports connected', (status) => {
  jest.useFakeTimers()
  try {
    const { result } = setup()
    act(() => channels[0].status!(status))
    expect(result.current.connected).toBe(false)
    act(() => channels[0].status!('SUBSCRIBED'))
    expect(result.current.connected).toBe(true)
  } finally {
    jest.useRealTimers()
  }
})

test('calls onSubscribed on every SUBSCRIBED, including after a drop', () => {
  const { onSubscribed } = setup()
  act(() => channels[0].status!('SUBSCRIBED'))
  expect(onSubscribed).toHaveBeenCalledTimes(1)
  act(() => channels[0].status!('CHANNEL_ERROR'))
  act(() => channels[0].status!('SUBSCRIBED'))
  expect(onSubscribed).toHaveBeenCalledTimes(2)
})

test('a channel the server closed is torn down and rebuilt after 2 seconds', () => {
  jest.useFakeTimers()
  try {
    setup()
    act(() => channels[0].status!('CLOSED'))
    expect(channels).toHaveLength(1)
    act(() => { jest.advanceTimersByTime(2000) })
    expect(supabase.removeChannel).toHaveBeenCalledWith(channels[0])
    expect(channels).toHaveLength(2)
  } finally {
    jest.useRealTimers()
  }
})

test('unmounting removes the channel', () => {
  const { unmount } = setup()
  unmount()
  expect(supabase.removeChannel).toHaveBeenCalledWith(channels[0])
})

test('a changed topic swaps the channel, and a null topic tears it down', () => {
  const { rerender } = setup('topic:a')
  rerender({ t: 'topic:b' })
  expect(supabase.removeChannel).toHaveBeenCalledWith(channels[0])
  expect(channels).toHaveLength(2)
  rerender({ t: null })
  expect(supabase.removeChannel).toHaveBeenCalledWith(channels[1])
  expect(channels).toHaveLength(2)
})

test('two hook instances on the same topic never share a channel topic', () => {
  setup()
  setup()
  expect(topics).toHaveLength(2)
  expect(topics[0]).not.toBe(topics[1])
})

test('going to a null topic while down does not leave "reconnecting" showing', () => {
  const { result, rerender } = setup()
  act(() => channels[0].status!('CHANNEL_ERROR'))
  expect(result.current.connected).toBe(false)
  rerender({ t: null })
  expect(result.current.connected).toBe(true)
})
