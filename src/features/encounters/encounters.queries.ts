import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import { deleteEncounter, listEncounters, saveEncounter, type EncounterInput } from './encounters.api'

/** The GM's encounters. Never issued for a player: the query is disabled unless `isGm`. */
export function useEncounters(campaignId: string | undefined, isGm: boolean) {
  return useQuery({
    queryKey: qk.encounters(campaignId ?? ''),
    queryFn: () => listEncounters(campaignId!),
    enabled: isGm && !!campaignId,
  })
}

/** Create (no `encounterId`) or replace an encounter, then refresh the list. */
export function useSaveEncounter(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, encounterId }: { input: EncounterInput; encounterId?: string }) =>
      saveEncounter(campaignId, input, encounterId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.encounters(campaignId) }),
  })
}

export function useDeleteEncounter(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (encounterId: string) => deleteEncounter(encounterId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.encounters(campaignId) }),
  })
}
