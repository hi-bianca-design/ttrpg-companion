import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import { endSession, endTurn, getActiveSession, openSession, setCombat, setTurn } from './sessions.api'

/** Interim: other members see changes by polling until Realtime lands (PRD step 4). */
export const SESSION_POLL_MS = 10_000

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

export function useSetTurn(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, userId }: { sessionId: string; userId: string | null }) => setTurn(sessionId, userId),
    onSuccess: (session) => qc.setQueryData(qk.session(campaignId), session),
    // e.g. the member left meanwhile: refetch the session, and the member list so they stop being offered.
    onError: () => Promise.all([
      qc.invalidateQueries({ queryKey: qk.session(campaignId) }),
      qc.invalidateQueries({ queryKey: qk.campaign(campaignId) }),
    ]),
  })
}

export function useEndTurn(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => endTurn(sessionId),
    onSuccess: (session) => qc.setQueryData(qk.session(campaignId), session),
    // e.g. the GM already moved the turn: refetch so the banner reflects it.
    onError: () => qc.invalidateQueries({ queryKey: qk.session(campaignId) }),
  })
}
