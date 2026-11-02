import type { ReactNode } from 'react'
import { View } from 'react-native'
import { StepDots } from '@/components/ui/step-dots'
import { Text } from '@/components/ui/text'

type WizardProgressProps = { title: string; index: number; total: number; /** Sits at the end of the dots row (e.g. the wizard's X). */ trailing?: ReactNode }

/** Step title, "Step X of N" and a row of dots where the current step is a longer pill that slides along. */
export function WizardProgress({ title, index, total, trailing }: WizardProgressProps) {
  return (
    <View
      className="flex-1 gap-3"
      role="progressbar"
      accessibilityLabel={`${title}, step ${index + 1} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: index + 1 }}
    >
      <View className="flex-row items-center justify-between">
        <Text variant="label" tone="accent">{title}</Text>
        <Text variant="label">{`Step ${index + 1} of ${total}`}</Text>
      </View>
      <View className="min-h-8 flex-row items-center justify-between">
        <StepDots index={index} total={total} />
        {trailing}
      </View>
    </View>
  )
}
