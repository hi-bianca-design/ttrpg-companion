import { onlineManager, type MutationOptions, type QueryClient } from '@tanstack/react-query'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import {
  applyEnemyHp, moveEntry, nextTurn, setCurrentEntry, updateEnemy,
  type Combat, type CombatEntry, type EnemyPatch, type HpMode,
} from './combat.api'
import { applyHpLocal } from './hpLocal'
import { nextEntryLocal } from './turnLocal'

/**
 * The GM's combat edits that keep working without a connection. Each one is a mutation under a stable
 * key with its defaults registered on the client, so a mutation paused offline and persisted across a
 * reload finds its function again and resumes. While offline the edit is applied to the cached cards at
 * once (the device's copy of the server arithmetic) and the call waits; when the connection returns the
 * queue replays in order (one scope), each call exactly once. Replays are safe: HP batches are idempotent
 * and a stale Next turn is a server no-op. A failed replay refetches (which rolls the cards back) and toasts.
 */

/** `queued`: made while offline. It rides in the variables so it survives a reload with the mutation. */
type Ids = { campaignId: string; combatId: string; queued?: boolean }
export type QueuedCombatVars = {
  applyHp: Ids & { entryIds: string[]; mode: HpMode; amount: number; batch: string }
  nextTurn: Ids & { expectedEntryId: string }
  updateEnemy: Ids & { entryId: string; patch: EnemyPatch }
  setCurrent: Ids & { entryId: string }
  move: Ids & { entryId: string; toPosition: number }
}
type QueuedCombatData = { applyHp: string; nextTurn: Combat; updateEnemy: Combat; setCurrent: Combat; move: Combat }
export type QueuedCombatName = keyof QueuedCombatVars
type Ctx = { queued: boolean }

const NAMES: readonly QueuedCombatName[] = ['applyHp', 'nextTurn', 'updateEnemy', 'setCurrent', 'move']
const HEAD = 'combat'
/**
 * A queued edit whose replay hits a network failure (flaky Wi-Fi, a captive portal, a laptop waking) is
 * retried a bounded number of times with backoff, pausing while offline, instead of dropping the queue;
 * replays are safe (HP batches are idempotent, a stale turn is a no-op). A coded server error is final at
 * once, and an online tap is not retried (its caller is waiting and shows the error, as before).
 */
const NETWORK_RETRIES = 5
const retryable = new WeakSet<object>()
const isNetworkError = (e: unknown) => e instanceof AppError && e.code === 'network'
const retryDelay = (failures: number) => Math.min(500 * 2 ** failures, 8000)

/** One scope: queued edits run one after another, in the order the GM made them. */
const SCOPE = 'gm-combat'

export const combatMutationKey = (name: QueuedCombatName) => [HEAD, name] as const

export function isQueuedCombatMutation(key: readonly unknown[] | undefined): boolean {
  return key?.[0] === HEAD && NAMES.includes(key[1] as QueuedCombatName)
}

const send: { [N in QueuedCombatName]: (v: QueuedCombatVars[N]) => Promise<QueuedCombatData[N]> } = {
  applyHp: (v) => applyEnemyHp(v.combatId, v.entryIds, v.mode, v.amount, v.batch),
  nextTurn: (v) => nextTurn(v.combatId, v.expectedEntryId),
  updateEnemy: (v) => updateEnemy(v.entryId, v.patch),
  setCurrent: (v) => setCurrentEntry(v.entryId),
  move: (v) => moveEntry(v.entryId, v.toPosition),
}

const byPosition = (entries: CombatEntry[]) => [...entries].sort((a, b) => a.position - b.position)
const withCurrent = (entries: CombatEntry[], id: string) => entries.map((e) => (e.is_current === (e.id === id) ? e : { ...e, is_current: e.id === id }))
const trimToNull = (s: string | null) => (s === null ? null : s.trim() || null)

/** update_enemy's clamps for the fields the cards edit; anything else is copied as given. */
function patchLocal(e: CombatEntry, patch: EnemyPatch): CombatEntry {
  const next: CombatEntry = { ...e, ...patch }
  if ('name' in patch && patch.name !== undefined) next.name = patch.name.trim()
  if ('notes' in patch) next.notes = trimToNull(patch.notes ?? null)
  if ('defense_label' in patch) next.defense_label = trimToNull(patch.defense_label ?? null)
  const max = next.max_hp ?? next.hp ?? 0
  if (next.hp !== null) next.hp = Math.max(0, Math.min(next.hp, max))
  return next
}

/** combat_place_entry: the row moves to `to` (clamped to 1..n), the rest shift, positions stay dense. */
function placeLocal(entries: CombatEntry[], id: string, to: number): CombatEntry[] {
  const sorted = byPosition(entries)
  const moving = sorted.find((e) => e.id === id)
  if (!moving) return entries
  const rest = sorted.filter((e) => e.id !== id)
  const at = Math.max(1, Math.min(to, sorted.length)) - 1
  rest.splice(at, 0, moving)
  return rest.map((e, i) => (e.position === i + 1 ? e : { ...e, position: i + 1 }))
}

const local: { [N in QueuedCombatName]: (client: QueryClient, v: QueuedCombatVars[N]) => void } = {
  applyHp: (client, v) => edit(client, v.combatId, (es) => applyHpLocal(es, v.entryIds, v.mode, v.amount)),
  updateEnemy: (client, v) => edit(client, v.combatId, (es) => es.map((e) => (e.id === v.entryId && e.kind === 'enemy' ? patchLocal(e, v.patch) : e))),
  setCurrent: (client, v) => edit(client, v.combatId, (es) => (es.some((e) => e.id === v.entryId) ? withCurrent(es, v.entryId) : es)),
  move: (client, v) => edit(client, v.combatId, (es) => placeLocal(es, v.entryId, v.toPosition)),
  nextTurn: (client, v) => {
    const entries = client.getQueryData<CombatEntry[]>(qk.combatEntries(v.combatId))
    if (!entries) return
    const sorted = byPosition(entries)
    // A stale expectation is a no-op here as on the server.
    if (sorted.find((e) => e.is_current)?.id !== v.expectedEntryId) return
    const next = nextEntryLocal(
      sorted.map((e) => ({ id: e.id, kind: e.kind === 'enemy' ? ('enemy' as const) : ('player' as const), hp: e.hp })),
      v.expectedEntryId,
    )
    if (!next) return
    client.setQueryData<CombatEntry[]>(qk.combatEntries(v.combatId), withCurrent(entries, next.id))
    if (next.wrapped) client.setQueryData<Combat | null>(qk.combat(v.campaignId), (c) => (c ? { ...c, round: c.round + 1 } : c))
  },
}

function edit(client: QueryClient, combatId: string, fn: (entries: CombatEntry[]) => CombatEntry[]) {
  client.setQueryData<CombatEntry[]>(qk.combatEntries(combatId), (old) => (old ? fn(old) : old))
}

const refetchCombat = (client: QueryClient, v: Ids) =>
  Promise.all([
    client.invalidateQueries({ queryKey: qk.combat(v.campaignId) }),
    client.invalidateQueries({ queryKey: qk.combatOrder(v.combatId) }),
    client.invalidateQueries({ queryKey: qk.combatEntries(v.combatId) }),
  ])

/** The options of one queued combat mutation: used by the hooks and registered as the client's defaults. */
export function combatMutationOptions<N extends QueuedCombatName>(
  client: QueryClient,
  name: N,
): MutationOptions<QueuedCombatData[N], Error, QueuedCombatVars[N], Ctx> {
  return {
    mutationKey: combatMutationKey(name),
    mutationFn: (v) =>
      send[name](v).catch((e: unknown) => {
        if (v.queued && isNetworkError(e)) retryable.add(e as object)
        throw e
      }),
    // 'online': offline, the call is not attempted at all; the mutation pauses and resumes on reconnect.
    networkMode: 'online',
    retry: (failures, e) => retryable.has(e) && failures < NETWORK_RETRIES,
    retryDelay,
    scope: { id: SCOPE },
    onMutate: async (v) => {
      const queued = v.queued ?? !onlineManager.isOnline()
      if (queued) {
        await client.cancelQueries({ queryKey: qk.combatEntries(v.combatId) })
        local[name](client, v)
      }
      return { queued }
    },
    onSuccess: (_d, v) => {
      // Refetch once the queue is empty, so a refetch never wipes edits still waiting to replay.
      if (client.isMutating({ mutationKey: [HEAD] }) <= 1) return refetchCombat(client, v)
    },
    onError: (e, v, ctx) => {
      // Online, the caller shows the error (it awaited the call). A queued edit has no caller left.
      if (ctx?.queued) showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed)
      return refetchCombat(client, v)
    },
  }
}

/** Registers every queued combat mutation's defaults, so mutations restored after a reload can resume. */
export function registerCombatMutationDefaults(client: QueryClient): void {
  for (const name of NAMES) client.setMutationDefaults(combatMutationKey(name), combatMutationOptions(client, name))
}

/**
 * Online: the call's own promise (the caller awaits the server and shows its error). Offline: resolves at
 * once with nothing, because the edit is already on the card and queued; a later failure is the queue's to report.
 */
export function sentOrQueued<T>(sending: Promise<T>): Promise<T | undefined> {
  if (onlineManager.isOnline()) return sending
  sending.catch(() => {})
  return Promise.resolve(undefined)
}
