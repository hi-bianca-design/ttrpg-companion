// D&D sheet section: the 18 skills and 6 saving throws, with proficiency from class /
// background picks. Registered as `sheet.sections.proficiencies` in the module index.
import { View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import type { CharacterRecord, PickRecord } from '../../types'
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey, SKILLS } from '../definition'
import { formatModifier, getAbilityModifier, getProficiencyBonus, proficiencies } from '../rules'

type Row = { key: string; label: string; aside: string; value: number; proficient: boolean; a11y: string }

function RowList({ rows }: { rows: Row[] }) {
  return (
    <Card compact className="py-1">
      {rows.map((r, i) => (
        <View
          key={r.key}
          accessible
          accessibilityLabel={`${r.a11y} ${formatModifier(r.value)}${r.proficient ? ', proficient' : ''}`}
          className={cn('flex-row items-center gap-3 py-2', i < rows.length - 1 && 'border-b border-rule')}
        >
          <View className={cn('h-2 w-2 rotate-45', r.proficient ? 'bg-primary' : 'border border-rule')} />
          <Text variant="body-sm" className="flex-1">{r.label}</Text>
          <Text variant="label">{r.aside}</Text>
          <Text variant="subhead" tone={r.proficient ? 'accent' : 'default'}>{formatModifier(r.value)}</Text>
        </View>
      ))}
    </Card>
  )
}

export function ProficienciesSection({ character, picks }: { character: CharacterRecord; picks: PickRecord[] }) {
  const prof = getProficiencyBonus(character.level)
  const { saves, skills } = proficiencies(picks)
  const mod = (k: AbilityKey) => getAbilityModifier(character.stats[k] ?? 10)
  const short = (k: AbilityKey) => k.slice(0, 3).toUpperCase()

  const skillRows: Row[] = SKILLS.map((s) => {
    const proficient = skills.includes(s.key)
    return { key: s.key, label: s.label, aside: short(s.ability), value: mod(s.ability) + (proficient ? prof : 0), proficient, a11y: s.label }
  })
  const saveRows: Row[] = ABILITY_KEYS.map((k) => {
    const proficient = saves.includes(k)
    return { key: k, label: ABILITY_LABELS[k], aside: short(k), value: mod(k) + (proficient ? prof : 0), proficient, a11y: `${ABILITY_LABELS[k]} save` }
  })

  return (
    <>
      <SectionHeader id={`${character.id}:skills`} title="Skills" collapsible>
        <RowList rows={skillRows} />
      </SectionHeader>
      <SectionHeader id={`${character.id}:saving-throws`} title="Saving throws" collapsible>
        <RowList rows={saveRows} />
      </SectionHeader>
    </>
  )
}
