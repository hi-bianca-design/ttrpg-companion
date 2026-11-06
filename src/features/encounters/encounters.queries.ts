import { useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import { listEncounters } from './encounters.api'

/** The GM's encounters. Never issued for a player: the query is disabled unless `isGm`. */
export function useEncounters(campaignId: string | undefined, isGm: boolean) {
  return useQuery({
    queryKey: qk.encounters(campaignId ?? ''),
    queryFn: () => listEncounters(campaignId!),
    enabled: isGm && !!campaignId,
  })
}
