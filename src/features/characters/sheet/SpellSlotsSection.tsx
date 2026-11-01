import { View } from 'react-native'
import { ResourceTracker } from '@/components/game/ResourceTracker'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Text } from '@/components/ui/text'
import type { SlotsValue } from '@/systems/types'

type SpellSlotsSectionProps = {
  characterId: string
  slots: SlotsValue
  tierLabel?: (tier: string) => string
  onSpend: (tier: string) => void
  onRestore: (tier: string) => void
  /** Spell levels from here up have no slot left (see lowestBlockedLevel); one caption under the cards. */
  blockedFrom?: number | null
}

/** One pip tracker per slot tier, lowest first, and one line when slots run out. Renders nothing for non-casters. */
export function SpellSlotsSection({ characterId, slots, tierLabel = (t) => `Level ${t}`, onSpend, onRestore, blockedFrom = null }: SpellSlotsSectionProps) {
  const tiers = Object.keys(slots.tiers).sort((a, b) => Number(a) - Number(b))
  if (tiers.length === 0) return null
  const note = blockedFrom === null ? null
    : blockedFrom <= Number(tiers[0]) ? 'No spell slots left. Rest to recover them.'
    : `No spell slots left for level ${blockedFrom}+ spells.`
  return (
    <SectionHeader id={`${characterId}:spell-slots`} title="Spell slots" collapsible>
      <View className="gap-2">
        {tiers.map((tier) => (
          <ResourceTracker
            key={tier}
            display="pips"
            label={tierLabel(tier)}
            unit="slots"
            max={slots.tiers[tier].max}
            used={slots.tiers[tier].used}
            onSpend={() => onSpend(tier)}
            onRestore={() => onRestore(tier)}
          />
        ))}
        {note ? <Text variant="caption" tone="muted">{note}</Text> : null}
      </View>
    </SectionHeader>
  )
}
