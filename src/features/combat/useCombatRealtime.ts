import { useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import { useRealtimeChannel } from '@/lib/useRealtimeChannel'
import type { Combat } from './combat.api'

/**
 * Realtime as a SIGNAL, never a data feed. Listens for the session and the combat row changing, and on
 * any event (and on every (re)subscribe) refetches through the normal RLS-protected queries. It never
 * binds `combat_entries` or `combat_order` (they are not published) or DELETE events (those cannot be
 * filtered or row-level checked), so payloads never matter for privacy and the select policies alone
 * decide what a device sees. `enabled` is true only for an active member or the GM.
 */
export function useCombatRealtime(campaignId: string | undefined, enabled: boolean): { connected: boolean } {
  const qc = useQueryClient()

  const refetch = () => {
    if (!campaignId) return
    qc.invalidateQueries({ queryKey: qk.session(campaignId) })
    qc.invalidateQueries({ queryKey: qk.combat(campaignId) })
    const combat = qc.getQueryData<Combat | null>(qk.combat(campaignId))
    if (combat) {
      qc.invalidateQueries({ queryKey: qk.combatOrder(combat.id) })
      qc.invalidateQueries({ queryKey: qk.combatEntries(combat.id) })
    }
  }

  return useRealtimeChannel({
    topic: enabled && campaignId ? `combat:${campaignId}` : null,
    onSubscribed: refetch,
    bind: (channel) => {
      const filter = `campaign_id=eq.${campaignId}`
      return channel
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter }, refetch)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'combats', filter }, refetch)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'combats', filter }, refetch)
    },
  })
}
