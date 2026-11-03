import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import {
  addEnemies, applyEnemyHp, delayTurn, endMyTurn, getActiveCombat, getCombatEntries, getCombatOrder, moveEntry,
  nextTurn, removeEntry, setCurrentEntry, setInitiative, startCombat, undoEnemyHp, updateEnemy,
  type Combat, type EnemyPatch, type HpMode, type NewEnemy,
} from './combat.api'

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

export const useMoveEntry = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (_id, v: { entryId: string; toPosition: number }) => moveEntry(v.entryId, v.toPosition))

export const useNextTurn = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, v: { expectedEntryId: string }) => nextTurn(id, v.expectedEntryId))

export const useEndMyTurn = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, _: void) => endMyTurn(id))

export const useSetCurrentEntry = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (_id, v: { entryId: string }) => setCurrentEntry(v.entryId))

export const useDelayTurn = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, v: { expectedEntryId: string }) => delayTurn(id, v.expectedEntryId))

export const useAddEnemies = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, v: NewEnemy) => addEnemies(id, v))

export const useUpdateEnemy = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (_id, v: { entryId: string; patch: EnemyPatch }) => updateEnemy(v.entryId, v.patch))

export const useRemoveEntry = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (_id, v: { entryId: string }) => removeEntry(v.entryId))

export const useApplyEnemyHp = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, v: { entryIds: string[]; mode: HpMode; amount: number }) => applyEnemyHp(id, v.entryIds, v.mode, v.amount))

export const useUndoEnemyHp = (campaignId: string, combatId: string | undefined) =>
  useCombatMutation(campaignId, combatId, (id, v: { batch: string }) => undoEnemyHp(id, v.batch))
