import { ResourceTracker } from '@/components/game/ResourceTracker'
import { restoreSlot, spendSlot } from '@/systems/resources'
import type { ResourceDef, ResourceValue, SlotsValue } from '@/systems/types'

type FeatureTrackersProps = {
  defs: ResourceDef[]
  resources: Record<string, ResourceValue>
  onChangeResource: (key: string, apply: (cur: ResourceValue) => ResourceValue) => void
}

/** One pip tracker per limited-use class feature the character has (Second Wind, Rage, ...). */
export function FeatureTrackers({ defs, resources, onChangeResource }: FeatureTrackersProps) {
  return (
    <>
      {defs.map((def) => {
        if (def.kind !== 'slots' || def.group !== 'feature') return null
        const tier = (resources[def.key] as SlotsValue | undefined)?.tiers['1']
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
