import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { endSession, endTurn, getActiveSession, openSession, setCombat, setTurn } from '@/features/sessions/sessions.api'
import { SESSION_POLL_MS, useActiveSession, useEndSession, useOpenSession, useSetCombat, useSetTurn, useEndTurn } from '@/features/sessions/sessions.queries'
import { AppError } from '@/features/errors'
import { qk } from '@/lib/query-client'

jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn(), openSession: jest.fn(), endSession: jest.fn(), setCombat: jest.fn(), setTurn: jest.fn(), endTurn: jest.fn() }))

const session = { id: 's1', campaign_id: 'c1', status: 'active', opened_by: 'u1' }

function setup() {
  const client = makeTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

beforeEach(() => jest.clearAllMocks())

describe('useActiveSession', () => {
  it('is disabled without a campaign id', () => {
    const { wrapper } = setup()
    renderHook(() => useActiveSession(undefined), { wrapper })
    expect(getActiveSession).not.toHaveBeenCalled()
  })

  it('returns the active session, or null when there is none', async () => {
    ;(getActiveSession as jest.Mock).mockResolvedValueOnce(session).mockResolvedValueOnce(null)
    const a = setup()
    const first = renderHook(() => useActiveSession('c1'), { wrapper: a.wrapper })
    await waitFor(() => expect(first.result.current.data).toEqual(session))
    const b = setup()
    const second = renderHook(() => useActiveSession('c2'), { wrapper: b.wrapper })
    await waitFor(() => expect(second.result.current.data).toBeNull())
  })

  it('polls on a short interval until Realtime replaces it', () => {
    expect(SESSION_POLL_MS).toBe(10_000)
  })
})

describe('useOpenSession', () => {
  it('writes the returned session into the cache; a second open of the same session keeps one', async () => {
    ;(openSession as jest.Mock).mockResolvedValue(session)
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useOpenSession('c1'), { wrapper })
    await act(async () => { await result.current.mutateAsync() })
    await act(async () => { await result.current.mutateAsync() })
    expect(client.getQueryData(qk.session('c1'))).toEqual(session)
    expect(openSession).toHaveBeenCalledWith('c1')
  })
})

describe('useEndSession', () => {
  it('sets the cache to null on success', async () => {
    ;(endSession as jest.Mock).mockResolvedValue({ ...session, status: 'ended' })
    const { client, wrapper } = setup()
    client.setQueryData(qk.session('c1'), session)
    const { result } = renderHook(() => useEndSession('c1'), { wrapper })
    await act(async () => { await result.current.mutateAsync('s1') })
    expect(endSession).toHaveBeenCalledWith('s1')
    expect(client.getQueryData(qk.session('c1'))).toBeNull()
  })

  it('on no_active_session exposes the error and refetches the true state', async () => {
    ;(endSession as jest.Mock).mockRejectedValue(new AppError('no_active_session'))
    ;(getActiveSession as jest.Mock).mockResolvedValue(null)
    const { client, wrapper } = setup()
    client.setQueryData(qk.session('c1'), session)
    const active = renderHook(() => useActiveSession('c1'), { wrapper })
    const { result } = renderHook(() => useEndSession('c1'), { wrapper })
    await act(async () => { await result.current.mutateAsync('s1').catch(() => {}) })
    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'no_active_session' }))
    await waitFor(() => expect(active.result.current.data).toBeNull())
  })
})

describe('useSetCombat', () => {
  const inCombat = { ...session, in_combat: true, combat_started_by: 'u2' }

  it('writes the returned session into the cache; a second enter with the same row keeps one', async () => {
    ;(setCombat as jest.Mock).mockResolvedValue(inCombat)
    const { client, wrapper } = setup()
    client.setQueryData(qk.session('c1'), session)
    const { result } = renderHook(() => useSetCombat('c1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ sessionId: 's1', inCombat: true }) })
    await act(async () => { await result.current.mutateAsync({ sessionId: 's1', inCombat: true }) })
    expect(setCombat).toHaveBeenCalledWith('s1', true)
    expect(client.getQueryData(qk.session('c1'))).toEqual(inCombat)
  })

  it('on no_active_session exposes the error and refetches the true state', async () => {
    ;(setCombat as jest.Mock).mockRejectedValue(new AppError('no_active_session'))
    ;(getActiveSession as jest.Mock).mockResolvedValue(null)
    const { client, wrapper } = setup()
    client.setQueryData(qk.session('c1'), inCombat)
    const active = renderHook(() => useActiveSession('c1'), { wrapper })
    const { result } = renderHook(() => useSetCombat('c1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ sessionId: 's1', inCombat: false }).catch(() => {}) })
    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'no_active_session' }))
    await waitFor(() => expect(active.result.current.data).toBeNull())
  })

  it('a failure leaves the cached session as it was until the refetch resolves', async () => {
    ;(setCombat as jest.Mock).mockRejectedValue(new AppError('not_allowed'))
    ;(getActiveSession as jest.Mock).mockResolvedValue(inCombat)
    const { client, wrapper } = setup()
    client.setQueryData(qk.session('c1'), inCombat)
    const { result } = renderHook(() => useSetCombat('c1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ sessionId: 's1', inCombat: false }).catch(() => {}) })
    expect(client.getQueryData(qk.session('c1'))).toEqual(inCombat)
  })
})

describe('turn hooks', () => {
  const holding = { ...session, in_combat: true, current_turn_user_id: 'u2' }

  it('useSetTurn writes the returned session and passes null through to clear', async () => {
    ;(setTurn as jest.Mock).mockResolvedValueOnce(holding).mockResolvedValueOnce({ ...holding, current_turn_user_id: null })
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useSetTurn('c1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ sessionId: 's1', userId: 'u2' }) })
    expect(setTurn).toHaveBeenLastCalledWith('s1', 'u2')
    expect(client.getQueryData(qk.session('c1'))).toEqual(holding)
    await act(async () => { await result.current.mutateAsync({ sessionId: 's1', userId: null }) })
    expect(setTurn).toHaveBeenLastCalledWith('s1', null)
    expect(client.getQueryData<{ current_turn_user_id: string | null }>(qk.session('c1'))?.current_turn_user_id).toBeNull()
  })

  it('useEndTurn writes the returned session', async () => {
    ;(endTurn as jest.Mock).mockResolvedValue({ ...holding, current_turn_user_id: null })
    const { client, wrapper } = setup()
    client.setQueryData(qk.session('c1'), holding)
    const { result } = renderHook(() => useEndTurn('c1'), { wrapper })
    await act(async () => { await result.current.mutateAsync('s1') })
    expect(endTurn).toHaveBeenCalledWith('s1')
    expect(client.getQueryData<{ current_turn_user_id: string | null }>(qk.session('c1'))?.current_turn_user_id).toBeNull()
  })

  it.each([
    ['useSetTurn', 'invalid_turn_target', () => useSetTurn('c1'), setTurn, { sessionId: 's1', userId: 'u3' }],
    ['useEndTurn', 'not_your_turn', () => useEndTurn('c1'), endTurn, 's1'],
  ] as const)('%s rejecting %s exposes the error and refetches the true state', async (_name, code, hook, api, vars) => {
    ;(api as jest.Mock).mockRejectedValue(new AppError(code))
    ;(getActiveSession as jest.Mock).mockResolvedValue({ ...holding, current_turn_user_id: 'u9' })
    const { client, wrapper } = setup()
    client.setQueryData(qk.session('c1'), holding)
    const active = renderHook(() => useActiveSession('c1'), { wrapper })
    const { result } = renderHook(hook as () => { mutateAsync: (v: never) => Promise<unknown>; error: unknown }, { wrapper })
    await act(async () => { await result.current.mutateAsync(vars as never).catch(() => {}) })
    await waitFor(() => expect(result.current.error).toMatchObject({ code }))
    await waitFor(() => expect(active.result.current.data).toMatchObject({ current_turn_user_id: 'u9' }))
  })
})

test('a failed setTurn also marks the campaign (member list) stale so a departed member stops being offered', async () => {
  ;(setTurn as jest.Mock).mockRejectedValue(new AppError('invalid_turn_target'))
  ;(getActiveSession as jest.Mock).mockResolvedValue(null)
  const { client, wrapper } = setup()
  client.setQueryData(qk.campaign('c1'), { id: 'c1', members: [] })
  const { result } = renderHook(() => useSetTurn('c1'), { wrapper })
  await act(async () => { await result.current.mutateAsync({ sessionId: 's1', userId: 'gone' }).catch(() => {}) })
  expect(client.getQueryState(qk.campaign('c1'))?.isInvalidated).toBe(true)
})
