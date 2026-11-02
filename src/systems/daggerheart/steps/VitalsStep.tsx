import { View } from 'react-native'
import { SectionHeader, StatTile } from '@/components/game'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { StepIntro } from '@/features/characters/builder/StepIntro'
import { cn } from '@/lib/utils'
import type { BuilderStepProps } from '../../types'
import { HOPE_MAX } from '../definition'
import { DH_DEFAULTS } from '../draft'
import { parseCount } from './shared'

const FIELDS = [
  { key: 'hp_max', label: 'Hit Points', hint: 'From your class' },
  { key: 'armor_max', label: 'Armor', hint: 'Your armor’s score' },
  { key: 'evasion', label: 'Evasion', hint: 'From your class' },
] as const

export function VitalsStep({ draft, update }: BuilderStepProps) {
  return (
    <View className="gap-6">
      <StepIntro
        title="Vitals"
        description="These are common starting values. Change them to match your class and armor, or keep them and come back."
      />

      <SectionHeader id="builder-dh-vitals" title="Starting values">
        <Card className="gap-0 p-0">
          {FIELDS.map((f, i) => {
            const v = draft[f.key]
            return (
              <View
                key={f.key}
                className={cn('min-h-11 flex-row items-center gap-3 px-4 py-3', i < FIELDS.length - 1 && 'border-b border-rule')}
              >
                <View className="flex-1 gap-1">
                  <Text variant="subhead">{f.label}</Text>
                  <Text variant="caption" tone="muted">{f.hint}</Text>
                </View>
                <Input
                  className="flex-1 px-2 text-center"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={typeof v === 'number' ? String(v) : ''}
                  onChangeText={(t) => update({ [f.key]: parseCount(t) })}
                  accessibilityLabel={f.label}
                />
              </View>
            )
          })}
        </Card>
      </SectionHeader>

      <SectionHeader id="builder-dh-fixed" title="Everyone starts with">
        <View className="flex-row gap-2">
          <View className="flex-1">
            <StatTile label="Stress" value={DH_DEFAULTS.stress} sub="slots" />
          </View>
          <View className="flex-1">
            <StatTile label="Hope" value={DH_DEFAULTS.hope} sub={`/${HOPE_MAX}`} />
          </View>
        </View>
      </SectionHeader>
    </View>
  )
}
