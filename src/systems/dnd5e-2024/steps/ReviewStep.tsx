import { View } from 'react-native'
import { SectionHeader, StatTile } from '@/components/game'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { ABILITY_KEYS } from '../definition'
import { choiceSummary } from '../classChoices'
import { bonusFor, classChoices, levelOf, str, strList, toCharacter } from '../draft'
import { formatModifier, getAbilityModifier, getProficiencyBonus } from '../rules'
import { useDndContent } from './shared'

/** Summary of the draft: hero card with quick stats, abilities (peak highlighted), origin, personality, spells. */
export function ReviewStep({ draft }: BuilderStepProps) {
  const species = useDndContent('species')
  const backgrounds = useDndContent('background')
  const subclasses = useDndContent('subclass')
  const spells = useDndContent('spell')

  const c = toCharacter(draft)
  const level = levelOf(draft)
  const sp = species.items.find((s) => s.id === draft.species_id)
  const bg = backgrounds.items.find((b) => b.id === draft.background_id)
  const sub = subclasses.items.find((s) => s.id === draft.subclass_id)
  const hp = c.resources.hp as { max: number }
  const peak = Math.max(...ABILITY_KEYS.map((k) => c.stats[k]))
  const spellNames = strList(draft.spell_ids).map((id) => spells.items.find((s) => s.id === id)?.name).filter(Boolean) as string[]
  const personality = [
    ['Trait', str(draft.personality_trait)], ['Ideal', str(draft.ideal)], ['Bond', str(draft.bond)], ['Flaw', str(draft.flaw)],
  ].filter(([, v]) => v.trim())

  const choices = classChoices(draft)
  const features = choiceSummary(str(draft.class_name), (key) => choices[key] ?? [])
  const extraGear = strList(draft.equipment_custom).map((g) => g.trim()).filter(Boolean)

  return (
    <View className="gap-6">
      <Card tone="accent" className="gap-3">
        <View className="gap-1">
          <Text variant="eyebrow">Your character</Text>
          <Text variant="title">{c.name || 'Unnamed hero'}</Text>
          <Text variant="body-sm" tone="muted">
            {[`Level ${level} ${str(draft.class_name) || 'adventurer'}`, sub?.name].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {sp ? <Badge>{sp.name}</Badge> : null}
          {bg ? <Badge>{bg.name}</Badge> : null}
          {str(draft.alignment) ? <Badge>{str(draft.alignment)}</Badge> : null}
        </View>
        <View className="flex-row gap-2">
          {[
            { label: 'HP', value: hp.max },
            { label: 'AC', value: 10 + getAbilityModifier(c.stats.dexterity) },
            { label: 'Speed', value: sp?.data.speed ?? 30 },
            { label: 'Prof', value: formatModifier(getProficiencyBonus(level)) },
          ].map((s) => (
            <View key={s.label} className="flex-1">
              <StatTile label={s.label} value={s.value} />
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader id="review-abilities" title="Ability scores">
        <View className="gap-2">
          {[ABILITY_KEYS.slice(0, 3), ABILITY_KEYS.slice(3)].map((row) => (
            <View key={row.join()} className="flex-row gap-2">
              {row.map((k) => {
                const total = c.stats[k]
                const bonus = bonusFor(draft, k)
                return (
                  <View key={k} className="flex-1">
                    <StatTile
                      label={k.slice(0, 3).toUpperCase()}
                      value={total}
                      sub={`${formatModifier(getAbilityModifier(total))}${bonus ? ` · +${bonus} bg` : ''}`}
                      tone={total === peak ? 'highlight' : 'default'}
                    />
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      </SectionHeader>

      {features.length > 0 ? (
        <SectionHeader id="review-class-features" title="Class features">
          <Card className="gap-2">
            {features.map((f) => (
              <View key={f.key} className="gap-1">
                <Text variant="label">{f.label}</Text>
                <Text variant="body-sm">{f.value}</Text>
              </View>
            ))}
          </Card>
        </SectionHeader>
      ) : null}

      {extraGear.length > 0 ? (
        <SectionHeader id="review-extra-gear" title="Extra gear">
          <Card>
            <Text variant="body-sm">{extraGear.join(', ')}</Text>
          </Card>
        </SectionHeader>
      ) : null}

      {personality.length > 0 ? (
        <SectionHeader id="review-personality" title="Personality">
          <Card className="gap-2">
            {personality.map(([label, value]) => (
              <View key={label} className="gap-1">
                <Text variant="label">{label}</Text>
                <Text variant="narrative">{value}</Text>
              </View>
            ))}
          </Card>
        </SectionHeader>
      ) : null}

      {spellNames.length > 0 ? (
        <SectionHeader id="review-spells" title="Spells" action={<Text variant="label" tone="accent">{`${spellNames.length} chosen`}</Text>}>
          <View className="flex-row flex-wrap gap-1">
            {spellNames.map((n) => <Badge key={n}>{n}</Badge>)}
          </View>
        </SectionHeader>
      ) : null}
    </View>
  )
}
