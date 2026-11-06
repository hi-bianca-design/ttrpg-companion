import AsyncStorage from '@react-native-async-storage/async-storage'
import { createElement, type ReactNode } from 'react'
import { QueryClientProvider, onlineManager, useQuery, type QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { showToast } from '@/components/ui/toast'
import type { CharacterFull } from '@/features/characters/characters.api'
import { applyEnemyHp } from '@/features/combat/combat.api'
import { combatMutationKey } from '@/features/combat/offlineMutations'
import { PERSIST_MAX_AGE, clearPersistedCombat, diffPlayerHp, installOffline, persistKey, setOfflineUser } from '@/lib/offline'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../helpers/queryClient'
import { character, combat, enemy } from '../helpers/combat'

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api', () => ({
  ...jest.requireActual('@/features/combat/combat.api'),
  applyEnemyHp: jest.fn(), getCombatEntries: jest.fn(), getActiveCombat: jest.fn(), getCombatOrder: jest.fn(),
}))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const ALLOWED_HEADS = ['campaign', 'combat', 'combat-order', 'combat-entries', 'encounters', 'content']

type Stored = { timestamp: number; buster: string; clientState: { queries: { queryKey: unknown[] }[]; mutations: { mutationKey?: unknown[] }[] } }
async function stored(userId: string): Promise<Stored | null> {
  const raw = await AsyncStorage.getItem(persistKey(userId))
  return raw ? (JSON.parse(raw) as Stored) : null
}
const storedKeys = async () => (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(persistKey('')))

let client: QueryClient
let offline: { dispose: () => void }
beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
  client = makeTestQueryClient()
  offline = installOffline(client, { throttleMs: 0 })
})
afterEach(() => {
  offline.dispose()
  act(() => onlineManager.setOnline(true))
})

/** A GM's cache: everything the combat screen holds, plus keys that must never be persisted. */
function fillGmCache(c: QueryClient) {
  c.setQueryData(qk.combatEntries('cb1'), [enemy({ id: 'g1' })])
  c.setQueryData(qk.combat('camp1'), combat({ id: 'cb1' }))
  c.setQueryData(qk.combatOrder('cb1'), [])
  c.setQueryData(qk.encounters('camp1'), [{ id: 'enc1' }])
  c.setQueryData(qk.content('dnd5e-2024', 'spell', 'official'), [{ id: 'fireball' }])
  // Never persisted:
  c.setQueryData(qk.content('dnd5e-2024', 'spell', 'mine'), [{ id: 'homebrew' }])
  c.setQueryData(qk.content('dnd5e-2024', 'weapon', 'official'), [{ id: 'not-searched' }])
  c.setQueryData(qk.session('camp1'), { id: 's1' })
  c.setQueryData(qk.party('camp1'), [character('c1', 'Elara')])
  c.setQueryData(qk.character('c1'), character('c1', 'Elara'))
  c.setQueryData(qk.campaigns, [])
  c.setQueryData(['auth', 'session'], { access_token: 'secret' })
}

describe('what is persisted', () => {
  test('only the allow-list, under the signed-in user’s key', async () => {
    await setOfflineUser('u1')
    fillGmCache(client)
    await waitFor(async () => expect((await stored('u1'))?.clientState.queries.length).toBe(5))
    const keys = (await stored('u1'))!.clientState.queries.map((q) => q.queryKey)
    for (const key of keys) expect(ALLOWED_HEADS).toContain(key[0])
    expect(keys).toEqual(expect.arrayContaining([
      qk.combatEntries('cb1'), qk.combat('camp1'), qk.combatOrder('cb1'), qk.encounters('camp1'),
      qk.content('dnd5e-2024', 'spell', 'official'),
    ]))
    expect(JSON.stringify(keys)).not.toMatch(/session|party|character|campaigns|secret|homebrew|weapon/)
    expect(await storedKeys()).toEqual([persistKey('u1')])
  })

  test('a player’s device persists nothing: the combat and order are only kept next to GM entries', async () => {
    await setOfflineUser('u1')
    client.setQueryData(qk.combat('camp1'), combat({ id: 'cb1' }))
    client.setQueryData(qk.combatOrder('cb1'), [])
    client.setQueryData(qk.content('dnd5e-2024', 'spell', 'official'), [{ id: 'fireball' }])
    client.setQueryData(qk.party('camp1'), [])
    await waitFor(async () => expect(await stored('u1')).not.toBeNull())
    expect((await stored('u1'))!.clientState.queries).toEqual([])
  })

  test('queued combat edits are persisted; any other paused mutation is not', async () => {
    await setOfflineUser('u1')
    act(() => onlineManager.setOnline(false))
    client.getMutationCache().build(client, { mutationKey: combatMutationKey('applyHp') })
      .execute({ campaignId: 'camp1', combatId: 'cb1', entryIds: ['g1'], mode: 'damage', amount: 3, batch: 'b-1' }).catch(() => {})
    client.getMutationCache().build(client, { mutationKey: ['character-resources', 'c1'], mutationFn: async () => 1 })
      .execute({}).catch(() => {})
    await waitFor(async () => expect((await stored('u1'))?.clientState.mutations.length).toBe(1))
    expect((await stored('u1'))!.clientState.mutations[0].mutationKey).toEqual(combatMutationKey('applyHp'))
  })

  test('the GM’s own campaign record is persisted; a campaign someone else runs is not', async () => {
    await setOfflineUser('u1')
    fillGmCache(client)
    client.setQueryData(qk.campaign('camp1'), { id: 'camp1', gm_id: 'u1', members: [] })
    client.setQueryData(qk.campaign('camp2'), { id: 'camp2', gm_id: 'someone-else', members: [] })
    await waitFor(async () => expect((await stored('u1'))?.clientState.queries.length).toBe(6))
    const keys = (await stored('u1'))!.clientState.queries.map((q) => q.queryKey)
    expect(keys).toContainEqual(qk.campaign('camp1'))
    expect(keys).not.toContainEqual(qk.campaign('camp2'))
  })

  test('a player (not the GM) never has a campaign persisted', async () => {
    await setOfflineUser('player1')
    client.setQueryData(qk.campaign('camp1'), { id: 'camp1', gm_id: 'gm', members: [{ user_id: 'player1' }] })
    client.setQueryData(qk.combat('camp1'), combat({ id: 'cb1' }))
    await waitFor(async () => expect(await stored('player1')).not.toBeNull())
    expect((await stored('player1'))!.clientState.queries).toEqual([])
  })

  test('nothing is persisted before a user is known', async () => {
    fillGmCache(client)
    await new Promise((r) => setTimeout(r, 10))
    expect(await storedKeys()).toEqual([])
  })
})

describe('restore', () => {
  test('a reload restores the last cards for the same user', async () => {
    await setOfflineUser('u1')
    fillGmCache(client)
    await waitFor(async () => expect((await stored('u1'))?.clientState.queries.length).toBe(5))
    offline.dispose()

    client = makeTestQueryClient()
    offline = installOffline(client, { throttleMs: 0 })
    await setOfflineUser('u1')
    expect(client.getQueryData(qk.combatEntries('cb1'))).toEqual([enemy({ id: 'g1' })])
    expect(client.getQueryData(qk.party('camp1'))).toBeUndefined()
  })

  test('data older than 24 hours is dropped', async () => {
    const state = { buster: 'v1', timestamp: Date.now() - PERSIST_MAX_AGE - 1000, clientState: { queries: [{ queryKey: qk.combatEntries('cb1'), queryHash: JSON.stringify(qk.combatEntries('cb1')), state: { data: [enemy({ id: 'g1' })], dataUpdatedAt: 1, status: 'success', fetchStatus: 'idle', dataUpdateCount: 1, error: null, errorUpdateCount: 0, errorUpdatedAt: 0, fetchFailureCount: 0, fetchFailureReason: null, fetchMeta: null, isInvalidated: false } }], mutations: [] } }
    await AsyncStorage.setItem(persistKey('u1'), JSON.stringify(state))
    await setOfflineUser('u1')
    expect(client.getQueryData(qk.combatEntries('cb1'))).toBeUndefined()
  })

  test('another user never gets the previous user’s data: a user change clears it', async () => {
    await setOfflineUser('u1')
    fillGmCache(client)
    await waitFor(async () => expect(await stored('u1')).not.toBeNull())
    offline.dispose()

    client = makeTestQueryClient()
    offline = installOffline(client, { throttleMs: 0 })
    await setOfflineUser('u2')
    expect(client.getQueryData(qk.combatEntries('cb1'))).toBeUndefined()
    expect(await stored('u1')).toBeNull()
  })
})

describe('sign-out while a restore is still reading storage', () => {
  test('nothing of the old user lands in the cache or under the next user’s key', async () => {
    await setOfflineUser('u1')
    fillGmCache(client)
    client.setQueryData(qk.campaign('camp1'), { id: 'camp1', gm_id: 'u1', members: [] })
    await waitFor(async () => expect((await stored('u1'))?.clientState.queries.length).toBe(6))
    const raw = (await AsyncStorage.getItem(persistKey('u1')))!
    offline.dispose()

    // A reload: the restore's storage read is held open.
    client = makeTestQueryClient()
    offline = installOffline(client, { throttleMs: 0 })
    let release!: (v: string) => void
    // The storage mock's getItem is already a jest.fn: hold just the next call open.
    const getItem = AsyncStorage.getItem as jest.Mock
    getItem.mockImplementationOnce(() => new Promise<string | null>((r) => { release = r }))
    getItem.mockClear()
    const restoring = setOfflineUser('u1')
    await waitFor(() => expect(getItem).toHaveBeenCalled())

    // Signed out meanwhile (AuthProvider's order), then the read completes.
    await clearPersistedCombat()
    client.clear()
    release(raw)
    await restoring
    expect(client.getQueryCache().getAll()).toEqual([])
    expect(client.getMutationCache().getAll()).toEqual([])

    // The next user signs in; nothing of u1 is ever written under their key.
    await setOfflineUser('u2')
    client.setQueryData(qk.encounters('camp9'), [{ id: 'enc9' }])
    await waitFor(async () => expect(await stored('u2')).not.toBeNull())
    const json = JSON.stringify(await stored('u2'))
    expect(json).not.toMatch(/cb1|camp1|enc1|fireball/)
  })
})

describe('clearPersistedCombat', () => {
  test('removes every persisted entry and leaves other storage alone', async () => {
    await AsyncStorage.setItem(persistKey('someone-else'), '{}')
    await AsyncStorage.setItem('sb-auth-token', 'keep me')
    await setOfflineUser('u1')
    fillGmCache(client)
    await waitFor(async () => expect(await stored('u1')).not.toBeNull())

    await clearPersistedCombat()
    expect(await storedKeys()).toEqual([])
    expect(await AsyncStorage.getItem('sb-auth-token')).toBe('keep me')

    // Signed out: later cache changes are not written back.
    client.setQueryData(qk.combatEntries('cb2'), [])
    await new Promise((r) => setTimeout(r, 10))
    expect(await storedKeys()).toEqual([])
  })
})

describe('diffPlayerHp', () => {
  const withHp = (id: string, name: string, current: number) => character(id, name, { hp: { current } })

  test('returns only the names whose current HP changed', () => {
    const before = [withHp('c1', 'Elara', 22), withHp('c2', 'Bram', 22), withHp('c3', 'Ivo', 10)]
    const after = [withHp('c1', 'Elara', 22), withHp('c2', 'Bram', 15), withHp('c3', 'Ivo', 12)]
    expect(diffPlayerHp(before, after)).toEqual(['Bram', 'Ivo'])
  })

  test('a character missing on either side is not a change', () => {
    expect(diffPlayerHp([withHp('c1', 'Elara', 22)], [withHp('c2', 'Bram', 1)])).toEqual([])
  })
})

describe('coming back online', () => {
  test('flushes the queue, refetches combat and party, and names players whose HP changed', async () => {
    const party: { current: CharacterFull[] } = { current: [character('c1', 'Elara'), character('c2', 'Bram')] }
    client.setQueryData(qk.party('camp1'), party.current)
    client.setQueryData(qk.combatEntries('cb1'), [enemy({ id: 'g1' })])
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
    renderHook(() => useQuery({ queryKey: qk.party('camp1'), queryFn: async () => party.current, staleTime: Infinity }), { wrapper })
    ;(applyEnemyHp as jest.Mock).mockResolvedValue('b-1')
    const invalidate = jest.spyOn(client, 'invalidateQueries')

    act(() => onlineManager.setOnline(false))
    client.getMutationCache().build(client, { mutationKey: combatMutationKey('applyHp') })
      .execute({ campaignId: 'camp1', combatId: 'cb1', entryIds: ['g1'], mode: 'damage', amount: 3, batch: 'b-1' }).catch(() => {})
    // Bram's player took a hit on their own device meanwhile.
    party.current = [character('c1', 'Elara'), character('c2', 'Bram', { hp: { current: 9 } })]
    act(() => onlineManager.setOnline(true))

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Bram changed while you were offline'))
    expect(applyEnemyHp).toHaveBeenCalledTimes(1)
    const keys = invalidate.mock.calls.map((c) => (c[0] as { queryKey: unknown }).queryKey)
    expect(keys).toEqual(expect.arrayContaining([['combat'], ['combat-order'], ['combat-entries'], ['party']]))
  })

  test('a player’s device is not told (the notice is for the GM)', async () => {
    const party: { current: CharacterFull[] } = { current: [character('c1', 'Elara')] }
    client.setQueryData(qk.party('camp1'), party.current)
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
    renderHook(() => useQuery({ queryKey: qk.party('camp1'), queryFn: async () => party.current, staleTime: Infinity }), { wrapper })
    act(() => onlineManager.setOnline(false))
    party.current = [character('c1', 'Elara', { hp: { current: 3 } })]
    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(client.getQueryData<CharacterFull[]>(qk.party('camp1'))![0].resources.hp).toMatchObject({ current: 3 }))
    expect(showToast).not.toHaveBeenCalled()
  })

  test('no toast when nobody changed', async () => {
    client.setQueryData(qk.combatEntries('cb1'), [enemy({ id: 'g1' })])
    client.setQueryData(qk.party('camp1'), [character('c1', 'Elara')])
    act(() => onlineManager.setOnline(false))
    act(() => onlineManager.setOnline(true))
    await new Promise((r) => setTimeout(r, 10))
    expect(showToast).not.toHaveBeenCalled()
  })
})
