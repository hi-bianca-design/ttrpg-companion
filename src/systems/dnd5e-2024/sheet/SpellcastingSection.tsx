// D&D sheet section: the spell save DC for each casting class. Renders nothing for a non-caster.
// Registered as `sheet.sections.spellcasting`.
import { View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { SheetSectionProps } from '../../types'
import { ABILITY_LABELS } from '../definition'
import { spellSaveDCs } from '../rules'

export function SpellcastingSection({ character, picks }: SheetSectionProps) {
  const rows = spellSaveDCs(character, picks)
  if (rows.length === 0) return null
  const several = rows.length > 1

  return (
    <SectionHeader id={`${character.id}:spellcasting`} title="Spellcasting" collapsible>
      <View className="gap-2">
        {rows.map((r) => {
          const label = several ? `${r.className} spell save DC` : 'Spell save DC'
          return (
            <Card key={r.className} compact className="flex-row items-center justify-between gap-3" accessible accessibilityLabel={`${label} ${r.dc}`}>
              <View className="flex-1 gap-1">
                <Text variant="label">{several ? `Spell save DC (${r.className})` : 'Spell save DC'}</Text>
                <Text variant="caption" tone="muted">{`${r.className} · ${ABILITY_LABELS[r.ability]}`}</Text>
              </View>
              <Text variant="stat">{r.dc}</Text>
            </Card>
          )
        })}
      </View>
    </SectionHeader>
  )
}
