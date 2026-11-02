import { View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Text } from '@/components/ui/text'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'
import { useCharacterSession } from './useCharacterSession'

/** "Session: Active" for the current character sheet's campaign; renders nothing otherwise. */
export function SessionBadge() {
  const session = useCharacterSession(useCharacterRouteId())
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
