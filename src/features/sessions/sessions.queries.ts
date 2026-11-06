import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import { endSession, getActiveSession, openSession, setCombat } from './sessions.api'

/** Safety net only: Realtime (useCombatRealtime) invalidates this query when the session changes. */
export const SESSION_POLL_MS = 60_000

export function useActiveSession(campaignId: string | undefined) {
  return useQuery({
    queryKey: qk.session(campaignId ?? ''),
    queryFn: () => getActiveSession(campaignId!),
    enabled: !!campaignId,
    refetchInterval: SESSION_POLL_MS,
  })
}

export function useOpenSession(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => openSession(campaignId),
    onSuccess: (session) => qc.setQueryData(qk.session(campaignId), session),
  })
}

export function useEndSession(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => endSession(sessionId),
    onSuccess: () => qc.setQueryData(qk.session(campaignId), null),
    // e.g. someone else already ended it: refetch so the screen shows the true state.
    onError: () => qc.invalidateQueries({ queryKey: qk.session(campaignId) }),
  })
}

export function useSetCombat(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, inCombat }: { sessionId: string; inCombat: boolean }) => setCombat(sessionId, inCombat),
    onSuccess: (session) => qc.setQueryData(qk.session(campaignId), session),
    // e.g. the session ended meanwhile: refetch so the badge shows the true state.
    onError: () => qc.invalidateQueries({ queryKey: qk.session(campaignId) }),
  })
}
