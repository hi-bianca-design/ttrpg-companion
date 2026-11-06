import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

/**
 * What the GM sees once a fight is over: rounds fought and, where any enemy carried an XP value, the XP
 * earned. Nothing is credited to characters; the GM awards it. The values were captured before the end call
 * because the server deletes the combat's entries and order when it ends.
 */
export function EndCombatSummary({ round, xp, onClose }: { round: number; xp: number | null; onClose: () => void }) {
  return (
    <View className="gap-3">
      <Text variant="body">{`Rounds fought: ${round}`}</Text>
      {xp !== null ? <Text variant="body">{`XP earned: ${xp}`}</Text> : null}
      <Button accessibilityLabel="Close" onPress={onClose}>
        <Text>Close</Text>
      </Button>
    </View>
  )
}
