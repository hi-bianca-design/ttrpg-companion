import { View } from 'react-native'
import { CampaignCombatBadge } from './CombatBadge'
import { CampaignSessionBadge } from './SessionBadge'
import { useActiveSession } from './sessions.queries'

/**
 * The campaign screen's session status line, for a GM (who has no character sheet) and everyone
 * else: Session: Active leading, the combat badge trailing. Renders nothing, not an empty row,
 * without an active session (invited members can't read sessions, so they get nothing either).
 */
export function CampaignSessionStatus({ campaignId }: { campaignId: string }) {
  const session = useActiveSession(campaignId).data ?? null
  if (!session) return null
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <CampaignSessionBadge campaignId={campaignId} />
      <CampaignCombatBadge campaignId={campaignId} />
    </View>
  )
}
