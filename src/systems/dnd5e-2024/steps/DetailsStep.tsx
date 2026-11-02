import { View } from 'react-native'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { levelOf, str } from '../draft'
import { StepIntro } from './shared'

const MULTILINE = 'h-auto min-h-11 py-3'

export function DetailsStep({ draft, update }: BuilderStepProps) {
  const name = str(draft.name)
  const blank = name.length > 0 && name.trim().length === 0
  const className = str(draft.class_name)

  return (
    <View className="gap-6">
      <StepIntro title="Final details" description="Give your character a name, or skip this and come back. Appearance and backstory are optional too." />

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label nativeID="details-name">Character name</Label>
          <Text variant="caption" tone="muted">Required</Text>
        </View>
        <Input
          aria-labelledby="details-name"
          placeholder="e.g. Aria Stormwind"
          value={name}
          onChangeText={(v) => update({ name: v })}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
        />
        {blank ? <Text variant="caption" tone="destructive">Name can’t be blank</Text> : null}
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label nativeID="details-appearance">Appearance</Label>
          <Text variant="caption" tone="muted">Optional</Text>
        </View>
        <Input
          aria-labelledby="details-appearance"
          className={MULTILINE}
          placeholder="Height, eyes, hair, notable features…"
          value={str(draft.appearance)}
          onChangeText={(v) => update({ appearance: v })}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label nativeID="details-backstory">Backstory</Label>
          <Text variant="caption" tone="muted">Optional</Text>
        </View>
        <Input
          aria-labelledby="details-backstory"
          className={MULTILINE}
          placeholder="Where are they from? What drives them?"
          value={str(draft.backstory)}
          onChangeText={(v) => update({ backstory: v })}
          multiline
          textAlignVertical="top"
        />
      </View>

      {name.trim() ? (
        <Card compact className="gap-1">
          <Text variant="label">Creating</Text>
          <Text variant="heading">{name.trim()}</Text>
          {className ? <Text variant="body-sm" tone="muted">{`Level ${levelOf(draft)} ${className}`}</Text> : null}
        </Card>
      ) : null}
    </View>
  )
}
