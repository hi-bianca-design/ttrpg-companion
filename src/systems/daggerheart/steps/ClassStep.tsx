import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { OpenChoiceField } from '@/features/characters/builder/OpenChoiceField'
import { StepIntro } from '@/features/characters/builder/StepIntro'
import type { BuilderStepProps } from '../../types'
import { str } from '../draft'
import { CLASS_SUGGESTIONS } from './shared'

export function ClassStep({ draft, update }: BuilderStepProps) {
  return (
    <View className="gap-6">
      <StepIntro
        title="Class"
        description="Your class is what you do in the party. A class and a name are all you need to create your character."
      />
      <OpenChoiceField
        label="Class"
        help="Required to create. Type a class, or tap a suggestion."
        count={1}
        values={[str(draft.class_name)]}
        suggestions={CLASS_SUGGESTIONS}
        onChange={([v]) => update({ class_name: v ?? '' })}
      />
      <SectionHeader id="builder-dh-subclass" title="Subclass">
        <View className="gap-3">
          <Text variant="caption" tone="muted">Optional. Each class has its own subclasses.</Text>
          <Input
            accessibilityLabel="Subclass"
            placeholder="Type your subclass"
            value={str(draft.subclass_name)}
            onChangeText={(v) => update({ subclass_name: v })}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
      </SectionHeader>
    </View>
  )
}
