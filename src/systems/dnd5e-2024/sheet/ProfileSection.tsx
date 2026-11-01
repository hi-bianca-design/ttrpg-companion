// D&D sheet section: alignment, personality, appearance and backstory from `details`
// (written by the builder's Details and Personality steps). Registered as `sheet.sections.profile`.
import { View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { CharacterRecord, PickRecord } from '../../types'

const FIELDS = [
  { key: 'alignment', label: 'Alignment' },
  { key: 'personality_trait', label: 'Personality trait' },
  { key: 'ideal', label: 'Ideal' },
  { key: 'bond', label: 'Bond' },
  { key: 'flaw', label: 'Flaw' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'backstory', label: 'Backstory' },
] as const

export function ProfileSection({ character }: { character: CharacterRecord; picks: PickRecord[] }) {
  const set = FIELDS.flatMap((f) => {
    const v = character.details[f.key]
    return typeof v === 'string' && v.trim() ? [{ ...f, value: v.trim() }] : []
  })

  return (
    <SectionHeader id={`${character.id}:profile`} title="Profile" collapsible>
      {set.length === 0 ? (
        <Text variant="body-sm" tone="muted">No personality or backstory recorded yet.</Text>
      ) : (
        <Card className="gap-4">
          {set.map((f) => (
            <View key={f.key} className="gap-1">
              <Text variant="label">{f.label}</Text>
              <Text variant="body">{f.value}</Text>
            </View>
          ))}
        </Card>
      )}
    </SectionHeader>
  )
}
