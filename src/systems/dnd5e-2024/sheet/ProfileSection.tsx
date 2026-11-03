// D&D sheet section: alignment, personality, appearance and backstory from `details`
// (written by the builder's Details and Personality steps). Registered as `sheet.sections.profile`.
import { View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { CharacterRecord, PickRecord } from '../../types'
import { choiceSummary } from '../classChoices'
import { classChoice } from '../rules'

const FIELDS = [
  { key: 'alignment', label: 'Alignment' },
  { key: 'personality_trait', label: 'Personality trait' },
  { key: 'ideal', label: 'Ideal' },
  { key: 'bond', label: 'Bond' },
  { key: 'flaw', label: 'Flaw' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'backstory', label: 'Backstory' },
] as const

export function ProfileSection({ character, picks }: { character: CharacterRecord; picks: PickRecord[] }) {
  const set = FIELDS.flatMap((f) => {
    const v = character.details[f.key]
    return typeof v === 'string' && v.trim() ? [{ ...f, value: v.trim() }] : []
  })

  const className = picks.find((p) => p.kind === 'class')?.content.name ?? ''
  const features = choiceSummary(className, (key) => classChoice(picks, key))

  return (
    <SectionHeader id={`${character.id}:profile`} title="Profile" collapsible>
      {features.length > 0 ? (
        <Card className="mb-3 gap-4">
          <Text variant="eyebrow">Class features</Text>
          {features.map((f) => (
            <View key={f.key} className="gap-1">
              <Text variant="label">{f.label}</Text>
              <Text variant="body-sm">{f.value}</Text>
            </View>
          ))}
        </Card>
      ) : null}
      {set.length === 0 && features.length > 0 ? null : set.length === 0 ? (
        <Text variant="body-sm" tone="muted">No personality or backstory recorded yet.</Text>
      ) : (
        <Card className="gap-4">
          {set.map((f) => (
            <View key={f.key} className="gap-1">
              <Text variant="label">{f.label}</Text>
              <Text variant="narrative">{f.value}</Text>
            </View>
          ))}
        </Card>
      )}
    </SectionHeader>
  )
}
