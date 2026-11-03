import { View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Text } from '@/components/ui/text'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'
import type { Session } from './sessions.api'
import { useActiveSession } from './sessions.queries'
import { useCharacterSession } from './useCharacterSession'

/** "Session: Active" for an active session; renders nothing without one. */
export function SessionBadgeView({ session }: { session: Session | null }) {
  if (!session) return null
  return (
    <Badge accessibilityLabel="Session: Active">
      <View className="flex-row items-center gap-2">
        {/* a diamond, like the resource pips: the design system has no round marks */}
        <View className="h-2 w-2 rotate-45 bg-resource-sage" />
        <Text variant="label">Session: Active</Text>
      </View>
    </Badge>
  )
}

/** The character sheet's badge: the session is the open sheet's campaign's. */
export function SessionBadge() {
  return <SessionBadgeView session={useCharacterSession(useCharacterRouteId())} />
}

/** The campaign screen's badge (a GM has no sheet): the campaign is given, never looked up by character. */
export function CampaignSessionBadge({ campaignId }: { campaignId: string }) {
  return <SessionBadgeView session={useActiveSession(campaignId).data ?? null} />
}
