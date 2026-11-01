import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

type WizardProgressProps = { title: string; index: number; total: number }

/** Step title, "Step X of N" and a segmented bar (done and current segments filled). */
export function WizardProgress({ title, index, total }: WizardProgressProps) {
  return (
    <View
      className="flex-1 gap-2"
      role="progressbar"
      accessibilityLabel={`${title}, step ${index + 1} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: index + 1 }}
    >
      <View className="flex-row items-center justify-between">
        <Text variant="label" tone="accent">{title}</Text>
        <Text variant="label">{`Step ${index + 1} of ${total}`}</Text>
      </View>
      <View className="flex-row gap-1">
        {Array.from({ length: total }, (_, i) => (
          <View key={i} className={cn('h-1 flex-1 rounded-full', i <= index ? 'bg-primary' : 'bg-rule')} />
        ))}
      </View>
    </View>
  )
}
