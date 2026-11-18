import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { onlineManager } from '@tanstack/react-query'
import { act, render, waitFor } from '@testing-library/react-native'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { combatMutationKey } from '@/features/combat/offlineMutations'
import { installOffline, persistKey } from '@/lib/offline'
import { qk, queryClient } from '@/lib/query-client'
import { combat, enemy } from '../../helpers/combat'

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { getSession: jest.fn(), onAuthStateChange: jest.fn() },
  },
}))
jest.mock('@/features/combat/combat.api', () => ({
  ...jest.requireActual('@/features/combat/combat.api'),
  applyEnemyHp: jest.fn(), getCombatEntries: jest.fn(), getActiveCombat: jest.fn(), getCombatOrder: jest.fn(),
}))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

import { supabase } from '@/lib/supabase'

type Stored = { clientState: { queries: { queryKey: unknown[] }[]; mutations: unknown[] } }
async function stored(userId: string): Promise<Stored | null> {
  const raw = await AsyncStorage.getItem(persistKey(userId))
  return raw ? (JSON.parse(raw) as Stored) : null
}

let offline: { dispose: () => void }
beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
  queryClient.clear()
  offline = installOffline(queryClient, { throttleMs: 0 })
  ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
  ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
})
afterEach(() => {
  offline.dispose()
  queryClient.clear()
  act(() => onlineManager.setOnline(true))
})

// A frozen background tab resuming after someone else signed in: supabase-js emits SIGNED_IN with no SIGNED_OUT.
test('a different user signing in without a sign-out never inherits the previous GM’s data, on the same client', async () => {
  render(<AuthProvider><></></AuthProvider>)
  await waitFor(async () => {
    queryClient.setQueryData(qk.combatEntries('cb1'), [enemy({ id: 'g1' })])
    queryClient.setQueryData(qk.combat('camp1'), combat({ id: 'cb1' }))
    queryClient.setQueryData(qk.encounters('camp1'), [{ id: 'enc1' }])
    expect((await stored('u1'))?.clientState.queries.length).toBe(3)
  })
  act(() => onlineManager.setOnline(false))
  queryClient.getMutationCache().build(queryClient, { mutationKey: combatMutationKey('applyHp') })
    .execute({ campaignId: 'camp1', combatId: 'cb1', entryIds: ['g1'], mode: 'damage', amount: 3, batch: 'b-1' }).catch(() => {})
  await waitFor(async () => expect((await stored('u1'))?.clientState.mutations.length).toBe(1))

  const listener = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls[0][0]
  act(() => listener('SIGNED_IN', { user: { id: 'u2' } }))

  // u2 starts persisting; their first write must hold nothing of u1.
  await waitFor(async () => {
    queryClient.setQueryData(qk.encounters('camp9'), [{ id: 'enc9' }])
    expect(await stored('u2')).not.toBeNull()
  })
  const u2 = (await stored('u2'))!
  expect(u2.clientState.queries.map((q) => q.queryKey)).toEqual([qk.encounters('camp9')])
  expect(u2.clientState.mutations).toEqual([])
  expect(await stored('u1')).toBeNull()
  expect(queryClient.getQueryData(qk.combatEntries('cb1'))).toBeUndefined()
  expect(queryClient.getQueryData(qk.encounters('camp1'))).toBeUndefined()
  expect(queryClient.getMutationCache().getAll().filter((m) => m.state.isPaused)).toEqual([])
})

test('a token refresh for the same user keeps the cache', async () => {
  render(<AuthProvider><></></AuthProvider>)
  await act(async () => {})
  queryClient.setQueryData(qk.encounters('camp1'), [{ id: 'enc1' }])
  const listener = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls[0][0]
  act(() => listener('TOKEN_REFRESHED', { user: { id: 'u1' } }))
  expect(queryClient.getQueryData(qk.encounters('camp1'))).toEqual([{ id: 'enc1' }])
})

// An expired token while offline (no session, persistence only paused), then a different user signs in.
test('a session lost without sign-out, then another user: the previous user’s cache is cleared', async () => {
  render(<AuthProvider><></></AuthProvider>)
  await act(async () => {})
  queryClient.setQueryData(qk.encounters('camp1'), [{ id: 'enc1' }])
  const listener = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls[0][0]
  act(() => listener('TOKEN_REFRESHED', null))
  expect(queryClient.getQueryData(qk.encounters('camp1'))).toEqual([{ id: 'enc1' }])
  act(() => listener('SIGNED_IN', { user: { id: 'u2' } }))
  expect(queryClient.getQueryData(qk.encounters('camp1'))).toBeUndefined()
})
