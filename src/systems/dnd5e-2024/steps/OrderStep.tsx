import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { orderFeature, orderOptions } from '../rules'
import { ChoiceCard, StepIntro } from './shared'

export function OrderStep({ draft, update }: BuilderStepProps) {
  const className = typeof draft.class_name === 'string' ? draft.class_name : ''
  return (
    <View className="gap-6">
      <StepIntro title={orderFeature(className) ?? 'Order'} description={`${className} chooses a calling at level 1.`} />
      <View className="gap-2">
        {orderOptions(className).map((o) => (
          <ChoiceCard key={o.key} title={o.label} selected={draft.class_order === o.key} onPress={() => update({ class_order: o.key })}>
            <Text variant="body-sm" tone="muted">{o.description}</Text>
          </ChoiceCard>
        ))}
      </View>
    </View>
  )
}
