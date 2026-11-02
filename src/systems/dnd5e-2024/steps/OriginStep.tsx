import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Badge } from '@/components/ui/badge'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { ABILITY_LABELS, type AbilityKey } from '../definition'
import { skillKey } from '../rules'
import { ChoiceCard, QueryState, StepIntro, useDndContent } from './shared'

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())
const abilityLabel = (key: string) => ABILITY_LABELS[key as AbilityKey] ?? key

function Selected({ name }: { name?: string }) {
  return name ? <Text variant="label" tone="accent">{name}</Text> : null
}

export function OriginStep({ draft, update }: BuilderStepProps) {
  const backgrounds = useDndContent('background')
  const species = useDndContent('species')

  return (
    <View className="gap-6">
      <StepIntro title="Determine origin" description="Your background and species shape who you were before adventuring." />

      <SectionHeader
        id="builder-background"
        title="Background"
        action={<Selected name={backgrounds.items.find((b) => b.id === draft.background_id)?.name} />}
      >
        <QueryState isLoading={backgrounds.isLoading} isError={backgrounds.isError} onRetry={() => backgrounds.refetch()} />
        <View className="gap-2">
          {backgrounds.items.map((bg) => (
            <ChoiceCard
              key={bg.id}
              title={bg.name}
              selected={draft.background_id === bg.id}
              aside={bg.owned ? <Badge>Homebrew</Badge> : null}
              onPress={() => update({
                background_id: bg.id,
                bg_abilities: bg.data.ability_score_options.abilities ?? [],
                bg_skills: bg.data.skill_proficiencies.map(skillKey),
              })}
            >
              {bg.description ? <Text variant="body-sm" tone="muted" numberOfLines={2}>{bg.description}</Text> : null}
              <Text variant="caption" tone="accent">
                {`Skills: ${bg.data.skill_proficiencies.map(titleCase).join(', ')}`}
              </Text>
              {bg.data.ability_score_options.abilities?.length ? (
                <Text variant="caption" tone="muted">
                  {`Ability bonuses: ${bg.data.ability_score_options.abilities.map(abilityLabel).join(', ')}`}
                </Text>
              ) : null}
            </ChoiceCard>
          ))}
        </View>
      </SectionHeader>

      <SectionHeader
        id="builder-species"
        title="Species"
        action={<Selected name={species.items.find((s) => s.id === draft.species_id)?.name} />}
      >
        <QueryState isLoading={species.isLoading} isError={species.isError} onRetry={() => species.refetch()} />
        <View className="gap-2">
          {species.items.map((sp) => {
            const traits = sp.data.traits.traits?.map((t) => t.name) ?? []
            return (
              <ChoiceCard
                key={sp.id}
                title={sp.name}
                selected={draft.species_id === sp.id}
                aside={sp.owned ? <Badge>Homebrew</Badge> : null}
                onPress={() => update({ species_id: sp.id })}
              >
                <Text variant="body-sm" tone="muted">{`${sp.data.size} · Speed ${sp.data.speed} ft`}</Text>
                {traits.length > 0 ? (
                  <Text variant="caption" tone="accent">{`Traits: ${traits.join(', ')}`}</Text>
                ) : null}
              </ChoiceCard>
            )
          })}
        </View>
      </SectionHeader>
    </View>
  )
}
