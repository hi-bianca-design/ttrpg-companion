import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { hydrate, onlineManager, type Query, type QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { persistQueryClientSubscribe, type PersistedClient } from '@tanstack/react-query-persist-client'
import { showToast } from '@/components/ui/toast'
import type { CharacterFull } from '@/features/characters/characters.api'
import { isQueuedCombatMutation, registerCombatMutationDefaults } from '@/features/combat/offlineMutations'
import { SEARCH_KINDS } from '@/features/search/useSearchIndex'
import type { PoolValue } from '@/systems/types'
import { setOfflineRestoring } from './offlineRestore'
import { qk } from './query-client'

/**
 * The GM's combat survives a dropped connection and a reload while offline (web). A small allow-list of
 * the cache (the GM's combat, order and entries, saved encounters, and the search index) plus the queued
 * combat edits are saved to device storage under the signed-in user's own key; nothing else (auth,
 * sessions, party, characters) is ever written. Persisted data older than a day is dropped. Sign-out and a
 * change of user clear it, so one user's GM data is never restored for another.
 */

export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000
const PREFIX = 'session-zero.offline.v1:'
const BUSTER = 'v1'
export const persistKey = (userId: string) => `${PREFIX}${userId}`

const COMBAT = qk.combat('')[0]
const ORDER = qk.combatOrder('')[0]
const ENTRIES = qk.combatEntries('')[0]
const ENCOUNTERS = qk.encounters('')[0]
const CONTENT = qk.content('dnd5e-2024', '', 'official')[0]
const PARTY = qk.party('')[0]
const CAMPAIGN = qk.campaign('')[0]

const hasData = (q: Query | undefined) => q?.state.data !== undefined && q.state.data !== null

/** This device holds GM data: some combat's full entries or a campaign's saved encounters (both GM only). */
function isGmDevice(client: QueryClient): boolean {
  const cache = client.getQueryCache()
  return cache.findAll({ queryKey: [ENTRIES] }).some(hasData) || cache.findAll({ queryKey: [ENCOUNTERS] }).some(hasData)
}

/**
 * The allow-list. Entries and encounters are GM-only by row-level security. The combat row and the order
 * are kept only beside that combat's entries (so a player's device keeps nothing), and search content only
 * on a GM's device, for the kinds the search index loads. A campaign record only when `userId` runs it,
 * so the campaign screen can open after a reload while offline; a campaign the user plays in never is.
 */
function shouldPersist(client: QueryClient, query: Query, userId: string): boolean {
  if (query.state.status !== 'success') return false
  const [head, a, b, c] = query.queryKey as unknown[]
  const cache = client.getQueryCache()
  const entriesOf = (combatId: unknown) => typeof combatId === 'string' && hasData(cache.find({ queryKey: qk.combatEntries(combatId), exact: true }))
  switch (head) {
    case ENTRIES:
    case ENCOUNTERS:
      return true
    case CAMPAIGN:
      return (query.state.data as { gm_id?: string } | null)?.gm_id === userId
    case COMBAT:
      return entriesOf((query.state.data as { id?: string } | null)?.id)
    case ORDER:
      return entriesOf(a)
    case CONTENT:
      return c === 'official' && (SEARCH_KINDS as readonly unknown[]).includes(b) && isGmDevice(client)
    default:
      return false
  }
}

let installed: { client: QueryClient; throttleMs: number } | null = null
let active: { userId: string; key: string; stop: () => void } | null = null
let generation = 0

// Writes go only to the active user's key: a throttled save that lands after sign-out is dropped.
const storage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => (active?.key === key ? AsyncStorage.setItem(key, value) : Promise.resolve()),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
}

function detach() {
  generation++
  setOfflineRestoring(false)
  active?.stop()
  active = null
}

async function removeKeys(keep: (key: string) => boolean) {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX) && !keep(k))
  if (keys.length > 0) await AsyncStorage.multiRemove(keys)
}

/** Stops persisting and removes every persisted entry (every user's). Run on sign-out. */
export async function clearPersistedCombat(): Promise<void> {
  detach()
  await removeKeys(() => false)
}

/**
 * Who is signed in. A user starts persisting under their own key (restoring what a reload left there);
 * a different user than the one active clears everything first, and any other user's leftovers are
 * removed. `null` (no session, which may just be an expired token while offline) only stops persisting.
 */
export async function setOfflineUser(userId: string | null): Promise<void> {
  const target = installed
  if (!target || active?.userId === userId) return
  if (userId === null) return detach()
  if (active) await clearPersistedCombat()
  else {
    detach()
    await removeKeys((k) => k === persistKey(userId))
  }
  const gen = ++generation
  const key = persistKey(userId)
  const persister = createAsyncStoragePersister({ storage, key, throttleTime: target.throttleMs })
  // Read, then hydrate only if nothing changed meanwhile: a sign-out (or another user) while storage was
  // being read must never put this user's GM data back into a cache that was just cleared.
  // A newer call (sign-out, another user) bumps the generation, which also ends the restoring flag.
  setOfflineRestoring(true)
  let saved: PersistedClient | undefined
  try {
    saved = await persister.restoreClient()
  } catch {
    // Unreadable: discard it and start fresh.
    await AsyncStorage.removeItem(key).catch(() => {})
  }
  if (gen !== generation || installed !== target) return
  const fresh = !!saved?.timestamp && Date.now() - saved.timestamp <= PERSIST_MAX_AGE && saved.buster === BUSTER
  if (saved && fresh) hydrate(target.client, saved.clientState)
  setOfflineRestoring(false)
  if (saved && !fresh) await AsyncStorage.removeItem(key).catch(() => {})
  if (gen !== generation || installed !== target) return
  const stop = persistQueryClientSubscribe({
    queryClient: target.client,
    persister,
    buster: BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: (q) => shouldPersist(target.client, q, userId),
      shouldDehydrateMutation: (m) => m.state.isPaused && isQueuedCombatMutation(m.options.mutationKey),
    },
  })
  active = { userId, key, stop }
  // Edits queued before the reload and restored while online go now.
  if (onlineManager.isOnline() && target.client.getMutationCache().getAll().some((m) => m.state.isPaused)) {
    void syncOnReturn(target.client)
  }
}

const hpOf = (c: CharacterFull) => (c.resources?.hp as PoolValue | undefined)?.current

/** Names of characters present on both sides whose current HP changed, each once, in `after` order. */
export function diffPlayerHp(before: CharacterFull[], after: CharacterFull[]): string[] {
  const was = new Map(before.map((c) => [c.id, hpOf(c)]))
  const names = new Map<string, string>()
  for (const c of after) {
    if (was.has(c.id) && was.get(c.id) !== hpOf(c)) names.set(c.id, c.name)
  }
  return [...names.values()]
}

const partyMembers = (client: QueryClient) =>
  client.getQueriesData<CharacterFull[]>({ queryKey: [PARTY] }).flatMap(([, d]) => d ?? [])

/**
 * Back online: replay the queue (in order, once each), then refetch the combat and the party. Players'
 * own numbers always win for their characters (the GM never writes them), the GM's edits win for enemies;
 * the GM is told whose HP moved meanwhile.
 */
async function syncOnReturn(client: QueryClient) {
  const before = partyMembers(client)
  await client.resumePausedMutations()
  await Promise.all([COMBAT, ORDER, ENTRIES, PARTY].map((head) => client.invalidateQueries({ queryKey: [head] })))
  if (!isGmDevice(client)) return
  const changed = diffPlayerHp(before, partyMembers(client))
  if (changed.length > 0) showToast(`${changed.join(', ')} changed while you were offline`)
}

/**
 * Wires the client once: the queued combat mutations' defaults, the reconnect sync, and (web) the
 * starting connection state, because the query library assumes online until an `offline` event and a
 * reload while offline sends none. Persisting starts when `setOfflineUser` names the user.
 */
export function installOffline(client: QueryClient, options: { throttleMs?: number } = {}): { dispose: () => void } {
  registerCombatMutationDefaults(client)
  installed = { client, throttleMs: options.throttleMs ?? 1000 }
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false) onlineManager.setOnline(false)
  let wasOffline = !onlineManager.isOnline()
  // Subscribed before the provider mounts the client, so the party snapshot is taken before its own reconnect refetch.
  const unsubscribe = onlineManager.subscribe((online) => {
    if (!online) {
      wasOffline = true
    } else if (wasOffline) {
      wasOffline = false
      void syncOnReturn(client)
    }
  })
  return {
    dispose: () => {
      unsubscribe()
      detach()
      if (installed?.client === client) installed = null
    },
  }
}

