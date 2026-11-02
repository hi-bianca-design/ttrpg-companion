import { View } from 'react-native'
import { ResourceTracker } from '@/components/game/ResourceTracker'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { adjustPool, restoreSlot, spendSlot } from '@/systems/resources'
import type { PoolValue, ResourceDef, ResourceValue, SlotsValue } from '@/systems/types'

type FeatureTrackersProps = {
  defs: ResourceDef[]
  resources: Record<string, ResourceValue>
  onChangeResource: (key: string, apply: (cur: ResourceValue) => ResourceValue) => void
}

const STEPS = [-5, -1, 1, 5]

/** The character's limited-use class features: pips for counted uses, a counter with +/- steps for a pool of points. */
export function FeatureTrackers({ defs, resources, onChangeResource }: FeatureTrackersProps) {
  return (
    <>
      {defs.map((def) => {
        if (def.group !== 'feature') return null
        const v = resources[def.key]
        if (def.kind === 'pool') {
          const pool = v as PoolValue | undefined
          if (!pool) return null
          return (
            <View key={def.key} className="gap-2">
              <ResourceTracker display="counter" label={def.label} current={pool.current} max={pool.max} />
              <View className="flex-row gap-2">
                {STEPS.map((step) => (
                  <Button
                    key={step}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    accessibilityLabel={`${step < 0 ? 'Spend' : 'Restore'} ${Math.abs(step)} ${def.label}`}
                    onPress={() => onChangeResource(def.key, (cur) => adjustPool(cur as PoolValue, step))}
                  >
                    <Text>{step > 0 ? `+${step}` : String(step)}</Text>
                  </Button>
                ))}
              </View>
            </View>
          )
        }
        const tier = (v as SlotsValue | undefined)?.tiers['1']
        if (!tier) return null
        return (
          <ResourceTracker
            key={def.key}
            display="pips"
            label={def.label}
            unit="uses"
            max={tier.max}
            used={tier.used}
            tint={def.tint}
            onSpend={() => onChangeResource(def.key, (cur) => spendSlot(cur as SlotsValue, '1'))}
            onRestore={() => onChangeResource(def.key, (cur) => restoreSlot(cur as SlotsValue, '1'))}
          />
        )
      })}
    </>
  )
}
