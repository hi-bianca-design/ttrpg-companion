import { View } from 'react-native'
import { OpenChoiceField } from '@/features/characters/builder/OpenChoiceField'
import { StepIntro } from '@/features/characters/builder/StepIntro'
import type { BuilderStepProps } from '../../types'
import { str } from '../draft'
import { ANCESTRY_SUGGESTIONS, COMMUNITY_SUGGESTIONS } from './shared'

export function HeritageStep({ draft, update }: BuilderStepProps) {
  return (
    <View className="gap-6">
      <StepIntro
        title="Heritage"
        description="Your ancestry is your people; your community is where you grew up. Type your own or pick one. You can skip this and come back."
      />
      <OpenChoiceField
        label="Ancestry"
        help="Type an ancestry, or tap a suggestion."
        count={1}
        values={[str(draft.ancestry)]}
        suggestions={ANCESTRY_SUGGESTIONS}
        onChange={([v]) => update({ ancestry: v ?? '' })}
      />
      <OpenChoiceField
        label="Community"
        help="Type a community, or tap a suggestion."
        count={1}
        values={[str(draft.community)]}
        suggestions={COMMUNITY_SUGGESTIONS}
        onChange={([v]) => update({ community: v ?? '' })}
      />
    </View>
  )
}
