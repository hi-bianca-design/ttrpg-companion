import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { OpenChoiceField } from '@/features/characters/builder/OpenChoiceField'
import type { BuilderStepProps } from '../../types'
import { type ChoiceKey, classChoicesFor } from '../classChoices'
import { SKILLS } from '../definition'
import { classChoices, proficientSkills, str, strList } from '../draft'
import { canMaster, orderOptions } from '../rules'
import { StepIntro, useDndContent } from './shared'

/**
 * The class's level-1 choices (Fighting Style, Weapon Mastery, Expertise, Divine / Primal Order) as open
 * fields: type anything, or tap a suggestion. Nothing here blocks Continue.
 */
export function ClassFeaturesStep({ draft, update }: BuilderStepProps) {
  const feats = useDndContent('feat')
  const items = useDndContent('item')
  const className = str(draft.class_name)
  const choices = classChoicesFor(className, strList(draft.class_features))
  const current = classChoices(draft)
  const orders = orderOptions(className)

  const suggestions: Record<ChoiceKey, string[]> = {
    fighting_style: feats.items.filter((f) => f.data.prerequisites.feature === 'Fighting Style').map((f) => f.name),
    weapon_mastery: items.items.filter((i) => canMaster(className, i.data)).map((i) => i.name),
    expertise: SKILLS.filter((s) => proficientSkills(draft).includes(s.key)).map((s) => s.label),
    order: orders.map((o) => o.label),
  }

  return (
    <View className="gap-6">
      <StepIntro
        title="Class features"
        description={`${className || 'Your class'} makes these choices at level 1. Type your own or pick a suggestion, which is only a suggestion. You can skip this and come back.`}
      />
      {choices.map((choice) => (
        <View key={choice.key} className="gap-2">
          <OpenChoiceField
            label={choice.label}
            help={choice.help}
            count={choice.count}
            values={current[choice.key] ?? []}
            suggestions={suggestions[choice.key]}
            onChange={(values) => update({ class_choices: { ...current, [choice.key]: values } })}
          />
          {choice.key === 'order' ? (
            <View className="gap-1">
              {orders.map((o) => (
                <Text key={o.key} variant="caption" tone="muted">{`${o.label}: ${o.description}`}</Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  )
}
