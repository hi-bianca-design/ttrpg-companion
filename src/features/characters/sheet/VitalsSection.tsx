import { View } from 'react-native'
import { ResourceTracker } from '@/components/game/ResourceTracker'
import { SectionHeader } from '@/components/game/SectionHeader'
import { StatTile } from '@/components/game/StatTile'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { getSystem } from '@/systems/registry'
import type { PoolValue, ResourceValue } from '@/systems/types'
import type { CharacterFull } from '../characters.api'
import { EmptyPoolTrackers } from './EmptyPoolTrackers'
import { findDerived, formatDerived } from './format'

type VitalsSectionProps = {
  character: CharacterFull
  onEditHp: () => void
  onBonusHp: () => void
  onSpendInspiration: () => void
  /** Writes one resource (death-save pips) through the resource mutation. */
  onChangeResource: (key: string, apply: (cur: ResourceValue) => ResourceValue) => void
}

const TILES = [
  { key: 'ac', label: 'AC' },
  { key: 'passive_perception', label: 'Passive' },
  { key: 'speed', label: 'Speed' },
]

/**
 * HP (tap to adjust), AC, Passive and Speed tiles; right under them Bonus HP and, when inspired, the
 * screen's one highlight action; then the resource cards: slots the system only shows while a pool
 * is empty (e.g. death saves at 0 HP) and its counter resources (e.g. hit dice).
 */
export function VitalsSection({ character, onEditHp, onBonusHp, onSpendInspiration, onChangeResource }: VitalsSectionProps) {
  const system = getSystem(character.system_id)
  const hp = character.resources.hp as PoolValue | undefined
  const temp = hp?.temp ?? 0
  const down = hp?.current === 0
  const inspired = Boolean(character.details.inspiration)

  const counters = system.resources.flatMap((def) => {
    const v = character.resources[def.key] as PoolValue | undefined
    return def.kind === 'pool' && def.display === 'counter' && v ? [{ def, v }] : []
  })

  return (
    <SectionHeader id={`${character.id}:vitals`} title="Vitals" collapsible>
      <View className="gap-3">
        <View className="flex-row gap-2">
          {hp ? (
            <View className="flex-1">
              <StatTile
                label="HP"
                value={hp.current}
                sub={temp > 0 ? `/${hp.max} +${temp}` : `/${hp.max}`}
                tone={down ? 'destructive' : 'highlight'}
                accessibilityHint="Adjust hit points"
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
            <Button variant="secondary" className="flex-1" accessibilityLabel="Spend inspiration" onPress={onSpendInspiration}>
              <Text numberOfLines={1}>Spend inspiration</Text>
            </Button>
          ) : null}
        </View>
        <EmptyPoolTrackers defs={system.resources} resources={character.resources} onChangeResource={onChangeResource} />
        {counters.map(({ def, v }) => (
          <ResourceTracker key={def.key} display="counter" label={def.label} current={v.current} max={v.max} />
        ))}
      </View>
    </SectionHeader>
  )
}
