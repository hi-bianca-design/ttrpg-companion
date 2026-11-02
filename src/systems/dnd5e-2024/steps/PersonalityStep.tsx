import { Pressable, View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import type { BuilderStepProps } from '../../types'
import { ALIGNMENTS } from '../definition'
import { str } from '../draft'
import { StepIntro } from './shared'

const COLUMNS = ['Lawful', 'Neutral', 'Chaotic']
const ROWS = [ALIGNMENTS.slice(0, 3), ALIGNMENTS.slice(3, 6), ALIGNMENTS.slice(6, 9)]

const FIELDS = [
  { key: 'personality_trait', label: 'Personality trait', hint: 'How do others see you?', placeholder: 'I always have a plan for when things go wrong.' },
  { key: 'ideal', label: 'Ideal', hint: 'What principle drives you?', placeholder: 'Fairness. No one should be above the law.' },
  { key: 'bond', label: 'Bond', hint: 'What ties you to the world?', placeholder: 'I would do anything for the people of my village.' },
  { key: 'flaw', label: 'Flaw', hint: 'What weakness holds you back?', placeholder: 'I can’t resist a pretty face or a shiny coin.' },
] as const

export function PersonalityStep({ draft, update }: BuilderStepProps) {
  const alignment = str(draft.alignment)

  return (
    <View className="gap-6">
      <StepIntro title="Alignment and personality" description="Helpful for roleplay, but you can skip this and come back. Every field can stay blank." />

      <SectionHeader id="builder-alignment" title="Alignment">
        <View className="gap-2" role="radiogroup" accessibilityLabel="Alignment">
          <View className="flex-row gap-2">
            {COLUMNS.map((c) => (
              <Text key={c} variant="label" className="flex-1 text-center">{c}</Text>
            ))}
          </View>
          {ROWS.map((row) => (
            <View key={row.join()} className="flex-row gap-2">
              {row.map((a) => {
                const selected = alignment === a
                return (
                  <Pressable
                    key={a}
                    role="radio"
                    accessibilityLabel={a}
                    accessibilityState={{ checked: selected }}
                    onPress={() => update({ alignment: selected ? '' : a })}
                    className={cn(
                      'min-h-11 flex-1 items-center justify-center rounded-sm border px-1 py-2',
                      selected ? 'border-primary bg-primary' : 'border-border bg-card',
                    )}
                  >
                    <Text
                      variant="caption"
                      className={cn('text-center', selected ? 'font-sans-semibold text-primary-foreground' : 'text-foreground')}
                    >
                      {a}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>
      </SectionHeader>

      <SectionHeader id="builder-personality" title="Personality">
        <View className="gap-4">
          {FIELDS.map((f) => (
            <View key={f.key} className="gap-1">
              <Label nativeID={`personality-${f.key}`}>{f.label}</Label>
              <Text variant="caption" tone="muted">{f.hint}</Text>
              <Input
                aria-labelledby={`personality-${f.key}`}
                className="mt-1 h-auto min-h-11 py-3"
                placeholder={f.placeholder}
                value={str(draft[f.key])}
                onChangeText={(v) => update({ [f.key]: v })}
                multiline
                textAlignVertical="top"
              />
            </View>
          ))}
        </View>
      </SectionHeader>
    </View>
  )
}
