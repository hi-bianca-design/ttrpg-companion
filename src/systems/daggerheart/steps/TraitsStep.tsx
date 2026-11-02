import { Minus, Plus } from 'phosphor-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { StepIntro } from '@/features/characters/builder/StepIntro'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { BuilderStepProps } from '../../types'
import { DH_STATS } from '../definition'
import { clampTrait, suggestedTraits, TRAIT_MAX, TRAIT_MIN } from '../draft'

const omit = (key: string) => (p: Record<string, string>) => {
  const next = { ...p }
  delete next[key]
  return next
}

const valueOf = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export function TraitsStep({ draft, update }: BuilderStepProps) {
  // Text still being typed that isn't a number yet ('-' or ''), so a negative value can be entered.
  const [pending, setPending] = useState<Record<string, string>>({})
  const iconColor = THEME_COLORS.accentForeground

  const type = (key: string, text: string) => {
    const cleaned = text.replace(/[^\d-]/g, '')
    const match = /^-?\d+/.exec(cleaned)
    if (!match) {
      setPending((p) => ({ ...p, [key]: cleaned.startsWith('-') ? '-' : '' }))
      return
    }
    setPending(omit(key))
    update({ [key]: clampTrait(parseInt(match[0], 10)) })
  }

  const step = (key: string, by: number) => {
    setPending(omit(key))
    update({ [key]: clampTrait(valueOf(draft[key]) + by) })
  }

  return (
    <View className="gap-6">
      <StepIntro
        title="Traits"
        description="Type a modifier for each trait, or start from the suggested array. You can skip this and come back."
      />

      <Button variant="outline" onPress={() => { setPending({}); update(suggestedTraits()) }} accessibilityLabel="Use suggested array">
        <Text>Use suggested array</Text>
      </Button>

      <SectionHeader id="builder-dh-traits" title="Modifiers">
        <Card className="gap-0 p-0">
          {DH_STATS.map((stat, i) => {
            const value = valueOf(draft[stat.key])
            return (
              <View
                key={stat.key}
                className={cn('min-h-11 flex-row items-center gap-3 px-4 py-3', i < DH_STATS.length - 1 && 'border-b border-rule')}
              >
                <View className="flex-1 gap-1">
                  <Text variant="subhead">{stat.label}</Text>
                  <Text variant="label">{stat.short}</Text>
                </View>
                <Button
                  size="icon"
                  variant="outline"
                  accessibilityLabel={`Lower ${stat.label}`}
                  disabled={value <= TRAIT_MIN}
                  onPress={() => step(stat.key, -1)}
                >
                  <Minus size={16} color={iconColor} />
                </Button>
                <Input
                  className="flex-1 px-2 text-center"
                  keyboardType="numbers-and-punctuation"
                  maxLength={2}
                  value={pending[stat.key] ?? String(value)}
                  onChangeText={(t) => type(stat.key, t)}
                  onBlur={() => setPending(omit(stat.key))}
                  accessibilityLabel={`${stat.label} modifier`}
                />
                <Button
                  size="icon"
                  variant="outline"
                  accessibilityLabel={`Raise ${stat.label}`}
                  disabled={value >= TRAIT_MAX}
                  onPress={() => step(stat.key, 1)}
                >
                  <Plus size={16} color={iconColor} />
                </Button>
              </View>
            )
          })}
        </Card>
      </SectionHeader>
    </View>
  )
}
