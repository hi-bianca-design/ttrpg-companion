import { ResourceTracker } from '@/components/game/ResourceTracker'
import { restoreSlot, spendSlot } from '@/systems/resources'
import type { PoolValue, ResourceDef, ResourceValue, SlotsValue } from '@/systems/types'

type EmptyPoolTrackersProps = {
  defs: ResourceDef[]
  resources: Record<string, ResourceValue>
  onChangeResource: (key: string, apply: (cur: ResourceValue) => ResourceValue) => void
}

/**
 * The system's slots resources that only matter while a pool is empty (`showWhenEmpty`, e.g. D&D
 * death saves at 0 HP), one pip tracker per tier. Renders nothing while every such pool is above 0.
 */
export function EmptyPoolTrackers({ defs, resources, onChangeResource }: EmptyPoolTrackersProps) {
  const shown = defs.flatMap((def) => {
    if (def.kind !== 'slots' || !def.showWhenEmpty) return []
    const trigger = resources[def.showWhenEmpty] as PoolValue | undefined
    const v = resources[def.key] as SlotsValue | undefined
    return trigger?.current === 0 && v ? [{ def, v }] : []
  })
  return (
    <>
      {shown.map(({ def, v }) =>
        Object.keys(v.tiers).sort((a, b) => Number(a) - Number(b)).map((tier, _i, tiers) => (
          <ResourceTracker
            key={`${def.key}:${tier}`}
            display="pips"
            label={tiers.length === 1 ? def.label : def.tierLabel?.(tier) ?? `${def.label} ${tier}`}
            max={v.tiers[tier].max}
            used={v.tiers[tier].used}
            tint={def.tint}
            count={def.count}
            onSpend={() => onChangeResource(def.key, (cur) => spendSlot(cur as SlotsValue, tier))}
            onRestore={() => onChangeResource(def.key, (cur) => restoreSlot(cur as SlotsValue, tier))}
          />
        )),
      )}
    </>
  )
}
