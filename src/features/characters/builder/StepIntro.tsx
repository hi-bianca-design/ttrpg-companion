// A builder step's heading: display title over a narrative description. System-agnostic.
import { View } from 'react-native'
import { Text } from '@/components/ui/text'

export function StepIntro({ title, description }: { title: string; description: string }) {
  return (
    <View className="gap-1">
      <Text variant="title">{title}</Text>
      <Text variant="narrative" tone="muted">{description}</Text>
    </View>
  )
}
