import { View } from 'react-native'
import { useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'
import { CombatBadge } from './CombatBadge'
import { SessionBadge } from './SessionBadge'
import { useCharacterSession } from './useCharacterSession'
import { useSessionRealtime } from './useSessionRealtime'

/**
 * The sheet's session status line: Session: Active leading, the combat badge trailing. Renders
 * nothing (no empty row) without an active session; wraps instead of clipping at large font sizes.
 */
export function SessionStatusRow() {
  const characterId = useCharacterRouteId()
  const session = useCharacterSession(characterId)
  // Mounted once per sheet, above the early return: it must also hear a session opening.
  useSessionRealtime(useCharacterCampaign(characterId).data?.id)
  if (!session) return null
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <SessionBadge />
      <CombatBadge />
    </View>
  )
}
