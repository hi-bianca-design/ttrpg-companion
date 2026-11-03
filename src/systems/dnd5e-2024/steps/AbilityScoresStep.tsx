import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Hairline } from '@/components/ui/hairline'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey, STANDARD_ARRAY } from '../definition'
import { bonusAbilities, bonusFor } from '../draft'
import { formatModifier, getAbilityModifier } from '../rules'
import { Chip, StepIntro, useDndContent } from './shared'

const short = (key: AbilityKey) => key.slice(0, 3).toUpperCase()

function scoreOf(draft: BuilderStepProps['draft'], key: AbilityKey): number | null {
  const v = draft[key]
  return typeof v === 'number' ? v : null
}

/** Digits only, clamped 1 to 20; empty (or no digits) clears the score. */
function parseScore(text: string): number | null {
  const digits = text.replace(/\D/g, '')
  if (digits === '') return null
  return Math.min(20, Math.max(1, parseInt(digits, 10)))
}

export function AbilityScoresStep({ draft, update }: BuilderStepProps) {
  const backgrounds = useDndContent('background')
  const background = backgrounds.items.find((b) => b.id === draft.background_id)
  const eligible = bonusAbilities(draft) as AbilityKey[]

  function useStandardArray() {
    update(Object.fromEntries(ABILITY_KEYS.map((k, i) => [k, STANDARD_ARRAY[i]])))
  }

  return (
    <View className="gap-6">
      <StepIntro
        title="Ability scores"
        description="Type each score, or use the standard array to start. You can skip this and come back."
      />

      <Button variant="outline" onPress={useStandardArray} accessibilityLabel="Use standard array">
        <Text>Use standard array</Text>
      </Button>

      <SectionHeader id="builder-abilities" title="Scores">
        <Card className="gap-0 p-0">
          {ABILITY_KEYS.map((key, i) => {
            const base = scoreOf(draft, key)
            const bonus = bonusFor(draft, key)
            const total = base === null ? null : base + bonus
            return (
              <View key={key} className="relative">
                {i < ABILITY_KEYS.length - 1 ? <Hairline className="absolute bottom-0 left-0 right-0" /> : null}
                <View className="min-h-11 flex-row items-center gap-3 px-4 py-3">
                  <View className="flex-1 gap-1">
                    <Text variant="subhead">{ABILITY_LABELS[key]}</Text>
                    <Text variant="label">{short(key)}</Text>
                  </View>
                  {total !== null && bonus > 0 ? <Text variant="caption" tone="accent">{`+${bonus} background`}</Text> : null}
                  <Input
                    className="flex-1 px-2 text-center"
                    keyboardType="number-pad"
                    maxLength={2}
                    value={base === null ? '' : String(base)}
                    onChangeText={(t) => update({ [key]: parseScore(t) })}
                    accessibilityLabel={`${ABILITY_LABELS[key]} score`}
                  />
                  <View className="w-11 items-end">
                    {total === null ? null : (
                      <>
                        <Text variant="stat">{total}</Text>
                        <Text variant="label" tone="accent">{formatModifier(getAbilityModifier(total))}</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            )
          })}
        </Card>
      </SectionHeader>

      <SectionHeader id="builder-bg-bonus" title="Background bonus">
        {background && eligible.length < 2 ? (
          <Text variant="body-sm" tone="muted">{`${background.name} grants no ability score bonuses.`}</Text>
        ) : background ? (
          <View className="gap-3">
            <Text variant="body-sm" tone="muted">
              {`${background.name} grants +2 to one of these abilities and +1 to another.`}
            </Text>
            <View className="gap-2">
              <Text variant="label">+2</Text>
              <View className="flex-row flex-wrap gap-2">
                {eligible.map((k) => (
                  <Chip
                    key={k}
                    label={ABILITY_LABELS[k]}
                    accessibilityLabel={`${ABILITY_LABELS[k]} plus 2`}
                    selected={draft.bg_bonus_two === k}
                    onPress={() => update({ bg_bonus_two: k, bg_bonus_one: draft.bg_bonus_one === k ? null : draft.bg_bonus_one })}
                  />
                ))}
              </View>
            </View>
            <View className="gap-2">
              <Text variant="label">+1</Text>
              <View className="flex-row flex-wrap gap-2">
                {eligible.filter((k) => k !== draft.bg_bonus_two).map((k) => (
                  <Chip
                    key={k}
                    label={ABILITY_LABELS[k]}
                    accessibilityLabel={`${ABILITY_LABELS[k]} plus 1`}
                    selected={draft.bg_bonus_one === k}
                    onPress={() => update({ bg_bonus_one: k })}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : (
          <Text variant="body-sm" tone="muted">Choose a background in the Origin step first.</Text>
        )}
      </SectionHeader>
    </View>
  )
}
