import { View } from 'react-native'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'
import { CombatBadge } from './CombatBadge'
import { SessionBadge } from './SessionBadge'
import { useCharacterSession } from './useCharacterSession'

/**
 * The sheet's session status line: Session: Active leading, the combat badge trailing. Renders
 * nothing (no empty row) without an active session; wraps instead of clipping at large font sizes.
 */
export function SessionStatusRow() {
  const session = useCharacterSession(useCharacterRouteId())
  if (!session) return null
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <SessionBadge />
      <CombatBadge />
    </View>
  )
}
