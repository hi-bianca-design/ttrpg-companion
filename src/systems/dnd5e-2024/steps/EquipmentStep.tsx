import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { parseEquipmentOption, resolveEquipment } from '../equipment'
import { strList } from '../draft'
import { ChoiceCard, QueryState, StepIntro, useDndContent } from './shared'

export function EquipmentStep({ draft, update }: BuilderStepProps) {
  const items = useDndContent('item')
  const className = typeof draft.class_name === 'string' ? draft.class_name : 'Your class'
  const options = strList(draft.class_equipment_options).map(parseEquipmentOption)

  const choose = (index: number) => {
    const { items: picked, other } = resolveEquipment(options[index], items.items)
    update({ equipment_option: index, equipment_items: picked, equipment_other: other, equipment_gold: options[index].gold })
  }

  return (
    <View className="gap-6">
      <StepIntro title="Starting equipment" description={`Choose how ${className} begins. Weapons and armor start equipped.`} />
      <QueryState isLoading={items.isLoading} isError={items.isError} onRetry={() => items.refetch()} />
      {items.isLoading || items.isError ? null : (
        <View className="gap-2">
          {options.map((option, i) => (
            <ChoiceCard
              key={option.label || i}
              title={option.label || `Option ${i + 1}`}
              selected={draft.equipment_option === i}
              onPress={() => choose(i)}
            >
              {option.entries.length > 0 ? (
                <Text variant="body-sm">{option.entries.map((e) => e.text).join(', ')}</Text>
              ) : null}
              <Text variant="caption" tone="accent">{`${option.gold} GP`}</Text>
            </ChoiceCard>
          ))}
        </View>
      )}
    </View>
  )
}
