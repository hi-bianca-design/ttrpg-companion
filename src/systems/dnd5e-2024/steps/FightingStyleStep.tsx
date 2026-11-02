import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { ChoiceCard, QueryState, StepIntro, useDndContent } from './shared'

export function FightingStyleStep({ draft, update }: BuilderStepProps) {
  const feats = useDndContent('feat')
  const className = typeof draft.class_name === 'string' ? draft.class_name : 'Your class'
  const styles = feats.items.filter((f) => f.data.prerequisites.feature === 'Fighting Style')

  return (
    <View className="gap-6">
      <StepIntro title="Fighting style" description={`${className} learns one fighting style at level 1.`} />
      <QueryState isLoading={feats.isLoading} isError={feats.isError} onRetry={() => feats.refetch()} />
      {feats.isLoading || feats.isError ? null : (
        <View className="gap-2">
          {styles.map((style) => (
            <ChoiceCard
              key={style.id}
              title={style.name}
              selected={draft.fighting_style_id === style.id}
              onPress={() => update({ fighting_style_id: style.id })}
            >
              <Text variant="body-sm" tone="muted">{style.data.benefits}</Text>
            </ChoiceCard>
          ))}
        </View>
      )}
    </View>
  )
}
