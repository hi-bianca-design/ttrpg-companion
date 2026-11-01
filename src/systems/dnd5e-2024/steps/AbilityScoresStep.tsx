import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import type { BuilderStepProps } from '../../types'
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey, STANDARD_ARRAY } from '../definition'
import { bonusFor } from '../draft'
import { formatModifier, getAbilityModifier } from '../rules'
import { Chip, StepIntro, useDndContent } from './shared'

const short = (key: AbilityKey) => key.slice(0, 3).toUpperCase()

function scoreOf(draft: BuilderStepProps['draft'], key: AbilityKey): number | null {
  const v = draft[key]
  return typeof v === 'number' ? v : null
}

export function AbilityScoresStep({ draft, update }: BuilderStepProps) {
  const [active, setActive] = useState<AbilityKey | null>(null)
  const backgrounds = useDndContent('background')
  const background = backgrounds.items.find((b) => b.id === draft.background_id)
  const eligible = (background?.data.ability_score_options.abilities ?? []).filter(
    (a): a is AbilityKey => (ABILITY_KEYS as readonly string[]).includes(a),
  )

  const used = ABILITY_KEYS.map((k) => scoreOf(draft, k)).filter((v): v is number => v !== null)
  const assignedCount = used.length

  function assign(key: AbilityKey, value: number) {
    update({ [key]: scoreOf(draft, key) === value ? null : value })
    setActive(null)
  }

  return (
    <View className="gap-6">
      <StepIntro
        title="Ability scores"
        description="Tap an ability, then pick a value from the standard array. Each value is used once."
      />

      <SectionHeader id="builder-standard-array" title="Standard array" action={<Text variant="label" tone="accent">{`${assignedCount}/6 assigned`}</Text>}>
        <View className="flex-row flex-wrap gap-2">
          {STANDARD_ARRAY.map((v) => (
            <View
              key={v}
              className={cn(
                'h-11 w-11 items-center justify-center rounded-full border',
                used.includes(v) ? 'border-border opacity-50' : 'border-primary',
              )}
            >
              <Text variant="subhead">{v}</Text>
            </View>
          ))}
        </View>
      </SectionHeader>

      <SectionHeader id="builder-abilities" title="Assign values">
        <Card className="gap-0 p-0">
          {ABILITY_KEYS.map((key, i) => {
            const base = scoreOf(draft, key)
            const bonus = bonusFor(draft, key)
            const total = base === null ? null : base + bonus
            const isActive = active === key
            return (
              <View key={key} className={cn(i < ABILITY_KEYS.length - 1 && 'border-b border-rule')}>
                <Pressable
                  role="button"
                  accessibilityLabel={`${ABILITY_LABELS[key]}${total === null ? ', unassigned' : `, ${total}`}`}
                  accessibilityState={{ expanded: isActive }}
                  onPress={() => setActive(isActive ? null : key)}
                  className="min-h-11 flex-row items-center gap-3 px-4 py-3"
                >
                  <View className="flex-1 gap-1">
                    <Text variant="subhead">{ABILITY_LABELS[key]}</Text>
                    <Text variant="label">{short(key)}</Text>
                  </View>
                  {total === null ? (
                    <Text variant="body-sm" tone="muted">Tap to assign</Text>
                  ) : (
                    <View className="flex-row items-center gap-3">
                      {bonus > 0 ? <Text variant="caption" tone="accent">{`+${bonus} background`}</Text> : null}
                      <View className="items-end">
                        <Text variant="stat">{total}</Text>
                        <Text variant="label" tone="accent">{formatModifier(getAbilityModifier(total))}</Text>
                      </View>
                    </View>
                  )}
                </Pressable>
                {isActive ? (
                  <View className="flex-row flex-wrap gap-2 px-4 pb-3">
                    {STANDARD_ARRAY.map((v) => {
                      const mine = base === v
                      return (
                        <Chip
                          key={v}
                          label={String(v)}
                          accessibilityLabel={`${v} for ${ABILITY_LABELS[key]}`}
                          selected={mine}
                          disabled={!mine && used.includes(v)}
                          onPress={() => assign(key, v)}
                          className="w-11 px-0"
                        />
                      )
                    })}
                  </View>
                ) : null}
              </View>
            )
          })}
        </Card>
      </SectionHeader>

      <SectionHeader id="builder-bg-bonus" title="Background bonus">
        {background ? (
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
