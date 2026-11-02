import { View } from 'react-native'
import { SectionHeader, StatTile } from '@/components/game'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps, SlotsValue } from '../../types'
import { DH_STATS } from '../definition'
import { toCharacter } from '../draft'

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
const slotMax = (v: unknown) => (v as SlotsValue).tiers['1'].max

/** Summary of the draft: hero card with vitals, traits, domain cards and experiences. */
export function ReviewStep({ draft }: BuilderStepProps) {
  const c = toCharacter(draft)
  const d = c.details as {
    evasion: number; experiences: string[]; ancestry: string; community: string
    class_name: string; subclass_name: string; domain_cards: string[]
  }
  const hope = c.resources.hope as { current: number; max: number }

  return (
    <View className="gap-6">
      <Card variant="hero" className="gap-3">
        <View className="gap-1">
          <Text variant="eyebrow">Your character</Text>
          <Text variant="title">{c.name || 'Unnamed hero'}</Text>
          <Text variant="body-sm" tone="muted">
            {[`Level 1 ${d.class_name || 'adventurer'}`, d.subclass_name].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {d.ancestry || d.community ? (
          <View className="flex-row flex-wrap gap-2">
            {d.ancestry ? <Badge>{d.ancestry}</Badge> : null}
            {d.community ? <Badge>{d.community}</Badge> : null}
          </View>
        ) : null}
        <View className="flex-row gap-2">
          {[
            { label: 'HP', value: slotMax(c.resources.hp) },
            { label: 'Armor', value: slotMax(c.resources.armor) },
            { label: 'Evasion', value: d.evasion },
            { label: 'Hope', value: `${hope.current}/${hope.max}` },
          ].map((s) => (
            <View key={s.label} className="flex-1">
              <StatTile label={s.label} value={s.value} />
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader id="review-dh-traits" title="Traits">
        <View className="gap-2">
          {[DH_STATS.slice(0, 3), DH_STATS.slice(3)].map((row) => (
            <View key={row.map((s) => s.key).join()} className="flex-row gap-2">
              {row.map((s) => (
                <View key={s.key} className="flex-1">
                  <StatTile label={s.short} value={signed(c.stats[s.key])} />
                </View>
              ))}
            </View>
          ))}
        </View>
      </SectionHeader>

      {d.domain_cards.length > 0 ? (
        <SectionHeader id="review-dh-cards" title="Domain cards">
          <View className="flex-row flex-wrap gap-1">
            {d.domain_cards.map((n) => <Badge key={n}>{n}</Badge>)}
          </View>
        </SectionHeader>
      ) : null}

      {d.experiences.length > 0 ? (
        <SectionHeader id="review-dh-experiences" title="Experiences">
          <View className="flex-row flex-wrap gap-1">
            {d.experiences.map((n) => <Badge key={n}>{n}</Badge>)}
          </View>
        </SectionHeader>
      ) : null}
    </View>
  )
}
