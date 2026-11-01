import { View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { StatTile } from '@/components/game/StatTile'
import { getSystem } from '@/systems/registry'
import type { CharacterFull } from '../characters.api'
import { findDerived, formatDerived } from './format'

/** The system's stats in rows of three: the modifier (from derived `<key>_mod`) as value, the score as sub. */
export function StatsSection({ character }: { character: CharacterFull }) {
  const stats = getSystem(character.system_id).stats
  const rows = Array.from({ length: Math.ceil(stats.length / 3) }, (_, i) => stats.slice(i * 3, i * 3 + 3))

  return (
    <SectionHeader id={`${character.id}:abilities`} title="Ability scores" collapsible>
      <View className="gap-2">
        {rows.map((row) => (
          <View key={row[0].key} className="flex-row gap-2">
            {row.map((stat) => {
              const score = character.stats[stat.key] ?? stat.default
              const mod = findDerived(character.derived, `${stat.key}_mod`)
              return (
                <View key={stat.key} className="flex-1">
                  <StatTile
                    label={stat.short}
                    value={mod ? formatDerived(mod) : score}
                    sub={mod ? String(score) : undefined}
                    accessibilityLabel={mod ? `${stat.label} ${formatDerived(mod)}, score ${score}` : `${stat.label} ${score}`}
                  />
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </SectionHeader>
  )
}
