import { View } from 'react-native'
import { Text } from '@/components/ui/text'

/** A round initial badge on a soft tint. */
export function Avatar({ initial }: { initial: string }) {
  return (
    <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
      <Text variant="subhead" className="text-accent-foreground">{initial}</Text>
    </View>
  )
}
