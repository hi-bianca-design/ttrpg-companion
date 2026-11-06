import React from 'react'
import { renderHook, act } from '@testing-library/react-native'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { queryClient } from '@/lib/query-client'
import { useBuilderStore } from '@/features/characters/builder/builder.store'

const mockUnsubscribe = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      }),
    },
  },
}))

jest.mock('@/lib/offline', () => ({ clearPersistedCombat: jest.fn(() => Promise.resolve()), setOfflineUser: jest.fn(() => Promise.resolve()) }))

import { supabase } from '@/lib/supabase'
import { clearPersistedCombat, setOfflineUser } from '@/lib/offline'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(supabase.auth.getSession as jest.Mock).mockReturnValue(new Promise(() => {}))
    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
  })

  it('returns loading true initially', () => {
    // getSession is a never-resolving promise, so loading stays true
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.loading).toBe(true)
  })

  it('returns null user when no session', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {})
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('throws when used outside AuthProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    )
  })

  it('clears the query cache on sign-out so the next user sees no stale data', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })
    const clear = jest.spyOn(queryClient, 'clear')
    renderHook(() => useAuth(), { wrapper })
    await act(async () => {})
    const listener = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls[0][0]
    act(() => listener('SIGNED_IN', { user: { id: 'u1' } }))
    expect(clear).not.toHaveBeenCalled()
    act(() => listener('SIGNED_OUT', null))
    expect(clear).toHaveBeenCalledTimes(1)
    clear.mockRestore()
  })

  it('drops the in-progress character draft on sign-out so the next user starts clean', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })
    renderHook(() => useAuth(), { wrapper })
    await act(async () => {})
    act(() => {
      useBuilderStore.getState().start('dnd5e-2024')
      useBuilderStore.getState().update({ name: 'Previous user hero' })
    })
    const listener = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls[0][0]
    act(() => listener('SIGNED_OUT', null))
    expect(useBuilderStore.getState()).toMatchObject({ systemId: null, draft: {} })
  })

  it('clears the persisted combat cache on sign-out, before the query cache', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })
    const clear = jest.spyOn(queryClient, 'clear')
    renderHook(() => useAuth(), { wrapper })
    await act(async () => {})
    const listener = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls[0][0]
    act(() => listener('SIGNED_OUT', null))
    expect(clearPersistedCombat).toHaveBeenCalledTimes(1)
    expect((clearPersistedCombat as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(clear.mock.invocationCallOrder[0])
    clear.mockRestore()
  })

  it('names the signed-in user for offline persistence once the session is known, and follows a user change', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    renderHook(() => useAuth(), { wrapper })
    await act(async () => {})
    expect(setOfflineUser).toHaveBeenLastCalledWith('u1')
    const listener = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls[0][0]
    act(() => listener('SIGNED_IN', { user: { id: 'u2' } }))
    expect(setOfflineUser).toHaveBeenLastCalledWith('u2')
  })

  it('does not touch offline persistence while the session is still loading', () => {
    renderHook(() => useAuth(), { wrapper })
    expect(setOfflineUser).not.toHaveBeenCalled()
    expect(clearPersistedCombat).not.toHaveBeenCalled()
  })
})
