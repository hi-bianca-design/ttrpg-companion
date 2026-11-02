import type { ReactNode } from 'react'
import { View } from 'react-native'
import { StepDots } from '@/components/ui/step-dots'
import { Text } from '@/components/ui/text'

type WizardProgressProps = {
  title: string
  index: number
  total: number
  /** Leading and trailing controls (Back, X) share the dots' row so all three sit on one centre line. */
  leading?: ReactNode
  trailing?: ReactNode
}

/**
 * Wizard header: one nav row (Back, centred dots, X) and a quiet "Step X of N · Title" eyebrow under it,
 * so controls < progress < step title in weight.
 */
export function WizardProgress({ title, index, total, leading, trailing }: WizardProgressProps) {
  return (
    <View
      className="gap-3"
      role="progressbar"
      accessibilityLabel={`${title}, step ${index + 1} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: index + 1 }}
    >
      <View className="min-h-11 flex-row items-center justify-between">
        <View className="w-11">{leading}</View>
        <StepDots index={index} total={total} />
        <View className="w-11 items-end">{trailing}</View>
      </View>
      <Text variant="eyebrow">{`Step ${index + 1} of ${total} · ${title}`}</Text>
    </View>
  )
}
