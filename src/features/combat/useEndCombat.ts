import { useSetCombat } from '@/features/sessions/sessions.queries'
import { showEndSummary, takeSnapshot } from './endCombatSummaryStore'

/**
 * The one way to end a fight: `setCombat(sessionId, false)`, with the round and XP taken from the GM screen's
 * snapshot first (the server deletes the entries on end). The summary shows only after the call succeeds;
 * a refusal rejects and shows nothing. Without a snapshot (no GM screen mounted) there is no summary.
 */
export function useEndCombat(campaignId: string) {
  const setCombat = useSetCombat(campaignId)
  return async (sessionId: string) => {
    const captured = takeSnapshot(campaignId)
    await setCombat.mutateAsync({ sessionId, inCombat: false })
    if (captured) showEndSummary(campaignId, captured)
  }
}
