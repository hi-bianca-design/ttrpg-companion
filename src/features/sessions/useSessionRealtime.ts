import { useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import { useRealtimeChannel } from '@/lib/useRealtimeChannel'

/**
 * Keeps a campaign's active session live: Realtime is a signal, never a data feed. A session opening
 * (INSERT) or changing (UPDATE: combat, turn, ended) refetches through `useActiveSession`, so the select
 * policy alone decides what a device sees (an invited member is delivered nothing). Every (re)subscribe
 * refetches too, since changes made while joining or down never arrived. DELETE is not bound: it cannot
 * be filtered or row-level checked.
 */
export function useSessionRealtime(campaignId: string | undefined): { connected: boolean } {
  const qc = useQueryClient()
  const refetch = () => {
    if (campaignId) qc.invalidateQueries({ queryKey: qk.session(campaignId) })
  }

  return useRealtimeChannel({
    topic: campaignId ? `session:${campaignId}` : null,
    onSubscribed: refetch,
    bind: (channel) => {
      const filter = `campaign_id=eq.${campaignId}`
      return channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions', filter }, refetch)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter }, refetch)
    },
  })
}
