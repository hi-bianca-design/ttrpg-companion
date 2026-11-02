import { View } from 'react-native'
import { OpenChoiceField } from '@/features/characters/builder/OpenChoiceField'
import { StepIntro } from '@/features/characters/builder/StepIntro'
import type { BuilderStepProps } from '../../types'
import { strList } from '../draft'

export function DomainCardsStep({ draft, update }: BuilderStepProps) {
  return (
    <View className="gap-6">
      <StepIntro
        title="Domain cards"
        description="Write down the two level 1 domain cards you take from your class’s domains. You can skip this and come back."
      />
      <OpenChoiceField
        label="Domain cards"
        help="Type each card’s name."
        count={2}
        values={strList(draft.domain_cards)}
        suggestions={[]}
        onChange={(domain_cards) => update({ domain_cards })}
      />
    </View>
  )
}
