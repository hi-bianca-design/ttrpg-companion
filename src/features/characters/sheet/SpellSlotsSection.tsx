import { View } from 'react-native'
import { ResourceTracker } from '@/components/game/ResourceTracker'
import { SectionHeader } from '@/components/game/SectionHeader'
import type { SlotsValue } from '@/systems/types'

type SpellSlotsSectionProps = {
  characterId: string
  slots: SlotsValue
  tierLabel?: (tier: string) => string
  onSpend: (tier: string) => void
  onRestore: (tier: string) => void
}

/** One pip tracker per slot tier, lowest first. Renders nothing for non-casters. */
export function SpellSlotsSection({ characterId, slots, tierLabel = (t) => `Level ${t}`, onSpend, onRestore }: SpellSlotsSectionProps) {
  const tiers = Object.keys(slots.tiers).sort((a, b) => Number(a) - Number(b))
  if (tiers.length === 0) return null
  return (
    <SectionHeader id={`${characterId}:spell-slots`} title="Spell slots" collapsible>
      <View className="gap-2">
        {tiers.map((tier) => (
          <ResourceTracker
            key={tier}
            display="pips"
            label={tierLabel(tier)}
            max={slots.tiers[tier].max}
            used={slots.tiers[tier].used}
            onSpend={() => onSpend(tier)}
            onRestore={() => onRestore(tier)}
          />
        ))}
      </View>
    </SectionHeader>
  )
}
