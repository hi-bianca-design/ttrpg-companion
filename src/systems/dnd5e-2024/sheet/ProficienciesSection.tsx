// D&D sheet section: the 18 skills and 6 saving throws, with proficiency from class /
// background picks. Registered as `sheet.sections.proficiencies` in the module index.
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Hairline } from '@/components/ui/hairline'
import { Disclosure } from '@/components/ui/ornament'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import type { CharacterRecord, PickRecord } from '../../types'
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey, SKILLS } from '../definition'
import { formatModifier, getAbilityModifier, getProficiencyBonus, orderSkillBonus, proficiencies, skillProficiencyBonus } from '../rules'

type Row = { key: string; label: string; aside: string; value: number; proficient: boolean; a11y: string }

function RowList({ rows }: { rows: Row[] }) {
  return (
    <Card compact className="py-1">
      {rows.map((r, i) => (
        <View
          key={r.key}
          accessible
          accessibilityLabel={`${r.a11y} ${formatModifier(r.value)}${r.proficient ? ', proficient' : ''}`}
          className="relative flex-row items-center gap-3 py-2"
        >
          {i < rows.length - 1 ? <Hairline className="absolute bottom-0 left-0 right-0" /> : null}
          <View className={cn('h-2 w-2 rotate-45', r.proficient ? 'bg-primary' : 'border border-border')} />
          <Text variant="body-sm" className="flex-1">{r.label}</Text>
          <Text variant="label">{r.aside}</Text>
          <Text variant="subhead" tone={r.proficient ? 'accent' : 'default'}>{formatModifier(r.value)}</Text>
        </View>
      ))}
    </Card>
  )
}

/** Trained skills lead; the rest tuck into an expander so the list opens on what matters. */
function SkillList({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(false)
  const trained = rows.filter((r) => r.proficient)
  const others = rows.filter((r) => !r.proficient)
  if (trained.length === 0) return <RowList rows={rows} />
  return (
    <View className="gap-2">
      <RowList rows={trained} />
      {others.length > 0 ? (
        <>
          <Pressable
            role="button"
            accessibilityLabel={`Other skills, ${others.length}`}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((o) => !o)}
            className="min-h-11 flex-row items-center justify-center gap-2"
          >
            <Text variant="label" tone="accent">{open ? 'Hide other skills' : `Show ${others.length} other skills`}</Text>
            <Disclosure open={open} />
          </Pressable>
          {open ? <RowList rows={others} /> : null}
        </>
      ) : null}
    </View>
  )
}

export function ProficienciesSection({ character, picks }: { character: CharacterRecord; picks: PickRecord[] }) {
  const prof = getProficiencyBonus(character.level)
  const known = proficiencies(picks)
  const { saves, skills } = known
  const mod = (k: AbilityKey) => getAbilityModifier(character.stats[k] ?? 10)
  const order = orderSkillBonus(picks, mod('wisdom'))
  const short = (k: AbilityKey) => k.slice(0, 3).toUpperCase()

  const skillRows: Row[] = SKILLS.map((s) => {
    const proficient = skills.includes(s.key)
    return { key: s.key, label: s.label, aside: short(s.ability), value: mod(s.ability) + skillProficiencyBonus(prof, s.key, known) + (order.skills.includes(s.key) ? order.bonus : 0), proficient, a11y: known.expertise.includes(s.key) ? `${s.label}, expertise` : s.label }
  })
  const saveRows: Row[] = ABILITY_KEYS.map((k) => {
    const proficient = saves.includes(k)
    return { key: k, label: ABILITY_LABELS[k], aside: short(k), value: mod(k) + (proficient ? prof : 0), proficient, a11y: `${ABILITY_LABELS[k]} save` }
  })

  return (
    <>
      <SectionHeader id={`${character.id}:skills`} title="Skills" collapsible>
        <SkillList rows={skillRows} />
      </SectionHeader>
      <SectionHeader id={`${character.id}:saving-throws`} title="Saving throws" collapsible>
        <RowList rows={saveRows} />
      </SectionHeader>
    </>
  )
}
