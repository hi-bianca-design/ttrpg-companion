import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { StepIntro } from '@/features/characters/builder/StepIntro'
import type { BuilderStepProps } from '../../types'
import { str, strList } from '../draft'

const MULTILINE = 'h-auto min-h-11 py-3'

export function DetailsStep({ draft, update }: BuilderStepProps) {
  const name = str(draft.name)
  const blank = name.length > 0 && name.trim().length === 0
  const experiences = [0, 1].map((i) => strList(draft.experiences)[i] ?? '')

  const setExperience = (i: number, value: string) => {
    const next = [...experiences]
    next[i] = value
    while (next.length > 0 && next[next.length - 1].trim() === '') next.pop()
    update({ experiences: next })
  }

  return (
    <View className="gap-6">
      <StepIntro title="Final details" description="Add a name to create your character. The rest can stay blank for now." />

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label nativeID="dh-details-name">Character name</Label>
          <Text variant="caption" tone="muted">Required to create</Text>
        </View>
        <Input
          aria-labelledby="dh-details-name"
          accessibilityLabel="Character name"
          placeholder="e.g. Wren Ashvale"
          value={name}
          onChangeText={(v) => update({ name: v })}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
        />
        {blank ? <Text variant="caption" tone="destructive">Name can’t be blank</Text> : null}
      </View>

      <SectionHeader id="builder-dh-experiences" title="Experiences">
        <View className="gap-3">
          <Text variant="caption" tone="muted">Two short phrases for things your character is good at, like “Wilderness guide”.</Text>
          {experiences.map((value, i) => (
            <Input
              key={i}
              accessibilityLabel={`Experience ${i + 1}`}
              placeholder="Type an experience"
              value={value}
              onChangeText={(v) => setExperience(i, v)}
              autoCorrect={false}
            />
          ))}
        </View>
      </SectionHeader>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label nativeID="dh-details-backstory">Backstory</Label>
          <Text variant="caption" tone="muted">Optional</Text>
        </View>
        <Input
          aria-labelledby="dh-details-backstory"
          className={MULTILINE}
          placeholder="Where are they from? What drives them?"
          value={str(draft.backstory)}
          onChangeText={(v) => update({ backstory: v })}
          multiline
          textAlignVertical="top"
        />
      </View>
    </View>
  )
}
