import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import {
  addEncounterEnemies, addEnemies, delayTurn, endMyTurn, getActiveCombat, getCombatEntries, getCombatOrder,
  newBatchId, removeEntry, setInitiative, startCombat, startPreparedCombat, undoEnemyHp,
  type Combat, type HpMode, type NewEnemy, type PreparedLaunch,
} from './combat.api'
import { combatMutationOptions, type QueuedCombatName, type QueuedCombatVars } from './offlineMutations'

/** The campaign's live (rolling or active) combat, or null. Realtime on `combats` invalidates it. */
export function useActiveCombat(campaignId: string | undefined) {
  return useQuery({
    queryKey: qk.combat(campaignId ?? ''),
    queryFn: () => getActiveCombat(campaignId!),
    enabled: !!campaignId,
  })
}

/** The player-safe order. Idle while rolling: the projection is empty until combat starts. */
export function useCombatOrder(combat: Combat | null | undefined) {
  return useQuery({
    queryKey: qk.combatOrder(combat?.id ?? ''),
    queryFn: () => getCombatOrder(combat!.id),
    enabled: combat?.status === 'active',
  })
}

/** The GM's truth. Never issued for a player: the query is disabled unless `isGm`. */
export function useCombatEntries(combat: Combat | null | undefined, isGm: boolean) {
  return useQuery({
    queryKey: qk.combatEntries(combat?.id ?? ''),
    queryFn: () => getCombatEntries(combat!.id),
    enabled: isGm && !!combat,
  })
}

/**
 * One mutation over a combat RPC. Success and error both invalidate the combat, order and entries
 * queries: the cure for a stale tap or an ended combat is a refetch, and the server stays the only
 * place that computes anything. Use `mutateAsync` where the caller must show the error after unmounting.
 */
function useCombatMutation<TVars, TData>(
  campaignId: string,
  combatId: string | undefined,
  fn: (combatId: string, vars: TVars) => Promise<TData>,
) {
  const qc = useQueryClient()
  const refetch = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.combat(campaignId) }),
      qc.invalidateQueries({ queryKey: qk.combatOrder(combatId ?? '') }),
      qc.invalidateQueries({ queryKey: qk.combatEntries(combatId ?? '') }),
    ])
  return useMutation({
    mutationFn: (vars: TVars) => fn(combatId ?? '', vars),
    onSuccess: refetch,
    onError: refetch,
  })
}

export const useStartCombat = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, _: void) => startCombat(id))

export const useSetInitiative = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (_id, v: { entryId: string; initiative: number | null }) => setInitiative(v.entryId, v.initiative))

/**
 * One of the GM's edits that keep working offline (see offlineMutations): same refetch rules as
 * useCombatMutation, plus a local copy on the cards and a queue while the connection is down. The caller
 * passes only its own fields; the campaign and combat ids ride in the variables so a mutation restored
 * after a reload still knows its fight.
 */
function useQueuedCombatMutation<N extends QueuedCombatName>(name: N, campaignId: string, combatId: string | undefined) {
  const qc = useQueryClient()
  const m = useMutation(combatMutationOptions(qc, name))
  const withIds = (v: Omit<QueuedCombatVars[N], 'campaignId' | 'combatId'>) =>
    ({ ...v, campaignId, combatId: combatId ?? '', queued: !onlineManager.isOnline() }) as QueuedCombatVars[N]
  return {
    ...m,
    mutate: (v: Omit<QueuedCombatVars[N], 'campaignId' | 'combatId'>) => m.mutate(withIds(v)),
    mutateAsync: (v: Omit<QueuedCombatVars[N], 'campaignId' | 'combatId'>) => m.mutateAsync(withIds(v)),
  }
}

export const useMoveEntry = (campaignId: string, combatId: string | undefined) => useQueuedCombatMutation('move', campaignId, combatId)

export const useNextTurn = (campaignId: string, combatId: string | undefined) => useQueuedCombatMutation('nextTurn', campaignId, combatId)

export const useEndMyTurn = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, v: { expectedRound: number }) => endMyTurn(id, v.expectedRound))

export const useSetCurrentEntry = (campaignId: string, combatId: string | undefined) => useQueuedCombatMutation('setCurrent', campaignId, combatId)

export const useDelayTurn = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, v: { expectedEntryId: string }) => delayTurn(id, v.expectedEntryId))

export const useAddEnemies = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, v: NewEnemy) => addEnemies(id, v))

export const useUpdateEnemy = (campaignId: string, combatId: string | undefined) => useQueuedCombatMutation('updateEnemy', campaignId, combatId)

export const useRemoveEntry = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (_id, v: { entryId: string }) => removeEntry(v.entryId))

type HpInput = { entryIds: string[]; mode: HpMode; amount: number; batch?: string }

/** The batch id is fixed before the call is queued, so a replay after a reconnect or reload is the same batch. */
export function useApplyEnemyHp(campaignId: string, combatId: string | undefined) {
  const m = useQueuedCombatMutation('applyHp', campaignId, combatId)
  const withBatch = (v: HpInput) => ({ ...v, batch: v.batch ?? newBatchId() })
  return { ...m, mutate: (v: HpInput) => m.mutate(withBatch(v)), mutateAsync: (v: HpInput) => m.mutateAsync(withBatch(v)) }
}

export const useUndoEnemyHp = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, v: { batch: string }) => undoEnemyHp(id, v.batch))

export const useAddEncounterEnemies = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, v: { encounterId: string }) => addEncounterEnemies(id, v.encounterId))

/**
 * GM only: the prepared launch. The combat's id may not exist yet (the launch can create it), so
 * success and error invalidate the order and entries of every combat, plus the campaign's combat
 * and session (the launch can enter combat).
 */
export function useStartPreparedCombat(campaignId: string, sessionId: string | undefined) {
  const qc = useQueryClient()
  const refetch = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.combat(campaignId) }),
      qc.invalidateQueries({ queryKey: qk.session(campaignId) }),
      qc.invalidateQueries({ queryKey: [qk.combatOrder('')[0]] }),
      qc.invalidateQueries({ queryKey: [qk.combatEntries('')[0]] }),
    ])
  return useMutation({
    mutationFn: (input: PreparedLaunch) => startPreparedCombat(sessionId ?? '', input),
    onSuccess: refetch,
    onError: refetch,
  })
}
