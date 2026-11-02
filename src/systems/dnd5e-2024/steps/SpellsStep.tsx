import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { extraCantrips, levelOf, str, strList } from '../draft'
import { getMaxSpellLevel, getSpellLimits } from '../rules'
import { ChoiceCard, QueryState, StepIntro, useDndContent } from './shared'

/** Case-insensitive name filter; a blank query keeps everything. */
export function filterSpells<T extends { name: string }>(spells: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  return q ? spells.filter((s) => s.name.toLowerCase().includes(q)) : spells
}

export function SpellsStep({ draft, update }: BuilderStepProps) {
  const [query, setQuery] = useState('')
  const spells = useDndContent('spell')
  const className = str(draft.class_name)
  const level = levelOf(draft)
  const maxSpellLevel = getMaxSpellLevel(className, level)
  const limits = getSpellLimits(className, level)
  const maxCantrips = limits.maxCantrips + extraCantrips(draft)
  const maxSpells = limits.maxSpells
  const selected = strList(draft.spell_ids)

  const available = useMemo(() => {
    const cls = className.toLowerCase()
    return spells.items.filter(
      (s) => s.data.level <= maxSpellLevel && s.data.classes.some((c) => c.toLowerCase() === cls),
    )
  }, [spells.items, className, maxSpellLevel])

  // Cache each listed spell's class list and level so pruneDraft can drop off-list spells on a
  // class change and keep picks within the level's max spell level and limits.
  useEffect(() => {
    if (available.length === 0) return
    const classes = (draft.spell_classes ?? {}) as Record<string, string[]>
    const levels = (draft.spell_levels ?? {}) as Record<string, number>
    const missing = available.filter((s) => !classes[s.id] || levels[s.id] === undefined)
    if (missing.length === 0) return
    update({
      spell_classes: { ...classes, ...Object.fromEntries(missing.map((s) => [s.id, s.data.classes.map((c) => c.toLowerCase())])) },
      spell_levels: { ...levels, ...Object.fromEntries(missing.map((s) => [s.id, s.data.level])) },
    })
  }, [available]) // only when the list changes, not on every draft edit

  const levelById = new Map(available.map((s) => [s.id, s.data.level]))
  const chosenCantrips = selected.filter((id) => levelById.get(id) === 0).length
  const chosenSpells = selected.filter((id) => (levelById.get(id) ?? 0) > 0).length

  function toggle(id: string, spellLevel: number) {
    if (selected.includes(id)) return update({ spell_ids: selected.filter((x) => x !== id) })
    if (spellLevel === 0 ? chosenCantrips >= maxCantrips : chosenSpells >= maxSpells) return
    update({ spell_ids: [...selected, id] })
  }

  const sections = useMemo(() => {
    const byLevel = new Map<number, typeof available>()
    for (const s of filterSpells(available, query)) byLevel.set(s.data.level, [...(byLevel.get(s.data.level) ?? []), s])
    return [...byLevel.entries()].sort(([a], [b]) => a - b)
  }, [available, query])

  return (
    <View className="gap-6">
      <StepIntro
        title="Choose spells"
        description={`Pick the cantrips and prepared spells your level ${level} ${className} starts with. You can change these later.`}
      />
      <View className="flex-row gap-2">
        {maxCantrips > 0 ? <Badge>{`Cantrips ${chosenCantrips}/${maxCantrips}`}</Badge> : null}
        <Badge>{`Prepared ${chosenSpells}/${maxSpells}`}</Badge>
      </View>
      <Input
        placeholder="Search spells"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search spells"
      />
      <QueryState isLoading={spells.isLoading} isError={spells.isError} onRetry={() => spells.refetch()} />
      {!spells.isLoading && !spells.isError && sections.length === 0 ? (
        <Text variant="body-sm" tone="muted">{query.trim() ? `No spells match “${query.trim()}”.` : 'No spells available.'}</Text>
      ) : null}
      {sections.map(([spellLevel, items]) => {
        const isCantrip = spellLevel === 0
        const full = isCantrip ? chosenCantrips >= maxCantrips : chosenSpells >= maxSpells
        return (
          <SectionHeader
            key={spellLevel}
            id={`builder-spells-${spellLevel}`}
            title={isCantrip ? 'Cantrips' : `Level ${spellLevel}`}
            action={<Text variant="label">{`${items.length} ${items.length === 1 ? 'spell' : 'spells'}`}</Text>}
          >
            <View className="gap-2">
              {full ? (
                <Text variant="caption" tone="muted">
                  {isCantrip ? 'Cantrip limit reached. Deselect one to swap.' : 'Prepared spell limit reached. Deselect one to swap.'}
                </Text>
              ) : null}
              {items.map((s) => {
                const isSelected = selected.includes(s.id)
                const atLimit = !isSelected && (s.data.level === 0 ? chosenCantrips >= maxCantrips : chosenSpells >= maxSpells)
                const tags = [s.data.is_ritual && 'Ritual', s.data.requires_concentration && 'Concentration'].filter(Boolean) as string[]
                return (
                  <ChoiceCard
                    key={s.id}
                    title={s.name}
                    accessibilityLabel={`${s.name}${tags.length ? `, ${tags.join(', ')}` : ''}`}
                    selected={isSelected}
                    disabled={atLimit}
                    onPress={() => toggle(s.id, s.data.level)}
                  >
                    <Text variant="body-sm" tone="muted">{`${s.data.casting_time} · ${s.data.range} · ${s.data.school}`}</Text>
                    {tags.length > 0 || s.owned ? (
                      <View className="flex-row flex-wrap gap-1">
                        {tags.map((t) => <Badge key={t}>{t}</Badge>)}
                        {s.owned ? <Badge>Homebrew</Badge> : null}
                      </View>
                    ) : null}
                  </ChoiceCard>
                )
              })}
            </View>
          </SectionHeader>
        )
      })}
    </View>
  )
}
