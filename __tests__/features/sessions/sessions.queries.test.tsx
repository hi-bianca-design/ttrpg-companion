import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { endSession, getActiveSession, openSession } from '@/features/sessions/sessions.api'
import { SESSION_POLL_MS, useActiveSession, useEndSession, useOpenSession } from '@/features/sessions/sessions.queries'
import { AppError } from '@/features/errors'
import { qk } from '@/lib/query-client'

jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn(), openSession: jest.fn(), endSession: jest.fn() }))

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
