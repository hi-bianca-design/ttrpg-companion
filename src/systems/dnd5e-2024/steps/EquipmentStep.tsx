import { useState } from 'react'
import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { parseEquipmentOption, resolveEquipment } from '../equipment'
import { strList } from '../draft'
import { ChoiceCard, QueryState, StepIntro, useDndContent } from './shared'

export function EquipmentStep({ draft, update }: BuilderStepProps) {
  const items = useDndContent('item')
  const className = typeof draft.class_name === 'string' ? draft.class_name : 'Your class'
  const options = strList(draft.class_equipment_options).map(parseEquipmentOption)

  const [text, setText] = useState('')
  const custom = strList(draft.equipment_custom)

  const add = () => {
    const value = text.trim()
    if (value === '') return
    if (!custom.some((c) => c.trim().toLowerCase() === value.toLowerCase())) update({ equipment_custom: [...custom, value] })
    setText('')
  }

  const choose = (index: number) => {
    const { items: picked, other } = resolveEquipment(options[index], items.items)
    update({ equipment_option: index, equipment_items: picked, equipment_other: other, equipment_gold: options[index].gold })
  }

  return (
    <View className="gap-6">
      <StepIntro title="Starting equipment" description={`${options.length > 0 ? `Choose how ${className} begins.` : 'Add the gear your character carries.'} Weapons and armor start equipped. You can skip this and come back.`} />
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
      <SectionHeader id="builder-own-items" title="Your own items">
        <View className="gap-3">
          <Text variant="caption" tone="muted">Add weapons, gear or anything else you carry. Type it your way.</Text>
          <Input
            accessibilityLabel="Item name"
            placeholder="e.g. Rope, 50 ft"
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            autoCapitalize="sentences"
            autoCorrect={false}
          />
          <Button variant="outline" onPress={add} accessibilityLabel="Add item">
            <Text>Add item</Text>
          </Button>
          {custom.map((item) => (
            <View key={item} className="flex-row items-center justify-between gap-2">
              <Text variant="body-sm" className="flex-1">{item}</Text>
              <Button variant="ghost" size="sm" onPress={() => update({ equipment_custom: custom.filter((c) => c !== item) })} accessibilityLabel={`Remove ${item}`}>
                <Text>Remove</Text>
              </Button>
            </View>
          ))}
        </View>
      </SectionHeader>
    </View>
  )
}
