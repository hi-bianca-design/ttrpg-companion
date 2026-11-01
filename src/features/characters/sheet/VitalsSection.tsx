import { View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { StatTile } from '@/components/game/StatTile'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import type { PoolValue } from '@/systems/types'
import type { CharacterFull } from '../characters.api'
import { findDerived, formatDerived } from './format'

type VitalsSectionProps = {
  character: CharacterFull
  onEditHp: () => void
  onBonusHp: () => void
  onSpendInspiration: () => void
}

const TILES = [
  { key: 'ac', label: 'AC' },
  { key: 'passive_perception', label: 'Passive' },
  { key: 'speed', label: 'Speed' },
]

/** HP (tap to adjust), AC, Passive and Speed tiles; Bonus HP and, when inspired, the screen's one highlight action. */
export function VitalsSection({ character, onEditHp, onBonusHp, onSpendInspiration }: VitalsSectionProps) {
  const hp = character.resources.hp as PoolValue | undefined
  const temp = hp?.temp ?? 0
  const inspired = Boolean(character.details.inspiration)

  return (
    <SectionHeader id={`${character.id}:vitals`} title="Vitals" collapsible>
      <View className="gap-3">
        <View className="flex-row gap-2">
          {hp ? (
            <View className="flex-1">
              <StatTile
                label="HP"
                value={hp.current}
                sub={temp > 0 ? `of ${hp.max} +${temp}` : `of ${hp.max}`}
                tone="highlight"
                onPress={onEditHp}
              />
            </View>
          ) : null}
          {TILES.map(({ key, label }) => {
            const d = findDerived(character.derived, key)
            return d ? (
              <View key={key} className="flex-1">
                <StatTile label={label} value={formatDerived(d)} />
              </View>
            ) : null
          })}
        </View>
        <View className="flex-row gap-2">
          {hp ? (
            // Sized to its label when inspiration shares the row, so "Spend inspiration" stays on one line.
            <Button variant="outline" className={inspired ? undefined : 'flex-1'} accessibilityLabel="+ Bonus HP" onPress={onBonusHp}>
              <Text numberOfLines={1}>+ Bonus HP</Text>
            </Button>
          ) : null}
          {inspired ? (
            <Button variant="highlight" className="flex-1" accessibilityLabel="Spend inspiration" onPress={onSpendInspiration}>
              <Text numberOfLines={1}>Spend inspiration</Text>
            </Button>
          ) : null}
        </View>
      </View>
    </SectionHeader>
  )
}
