import { View } from 'react-native'
import { ContentCard } from '@/components/game/ContentCard'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import type { PickRecord, SlotsValue } from '@/systems/types'

export type Segment = 'actions' | 'bonus' | 'reactions'

type Entry = {
  key: string
  segment: Segment
  title: string
  meta?: string
  tags: string[]
  /** Spell level; 0 for cantrips, undefined for weapons. */
  spellLevel?: number
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function segmentFor(castingTime: string): Segment {
  const t = castingTime.trim().toLowerCase()
  if (t.startsWith('bonus')) return 'bonus'
  if (t.startsWith('reaction')) return 'reactions'
  return 'actions'
}

/** Equipped weapons (always actions) and spells (by casting time) as card entries. */
export function buildEntries(picks: PickRecord[]): Entry[] {
  const out: Entry[] = []
  for (const p of picks) {
    const data = asRecord(p.content.data)
    if (p.kind === 'spell') {
      const level = typeof data.level === 'number' ? data.level : 0
      const castingTime = typeof data.casting_time === 'string' ? data.casting_time : 'Action'
      out.push({
        key: `spell:${p.content_id}`,
        segment: segmentFor(castingTime),
        title: p.content.name,
        meta: [data.school, data.range].filter((x): x is string => typeof x === 'string').join(' · ') || undefined,
        tags: ['Spell', level === 0 ? 'Cantrip' : `Level ${level} slot`],
        spellLevel: level,
      })
    } else if (p.state.equipped === true && typeof data.category === 'string' && data.category.includes('Weapon')) {
      const props = asRecord(data.properties)
      const damage = [props.damage, props.damage_type].filter((x): x is string => typeof x === 'string').join(' ')
      out.push({
        key: `weapon:${p.content_id}`,
        segment: 'actions',
        title: p.content.name,
        meta: typeof props.mastery === 'string' ? `Mastery · ${props.mastery}` : undefined,
        tags: damage ? ['Weapon', damage] : ['Weapon'],
      })
    }
  }
  // Weapons first, then spells by level (cantrips first); stable within each group.
  const rank = (e: Entry) => (e.spellLevel === undefined ? -1 : e.spellLevel)
  return out.sort((a, b) => rank(a) - rank(b))
}

/** Lowest slot tier at or above `level` with an unspent slot, or null. */
export function lowestTier(slots: SlotsValue | undefined, level: number): string | null {
  if (!slots) return null
  const tiers = Object.keys(slots.tiers).map(Number).filter((t) => t >= level).sort((a, b) => a - b)
  const tier = tiers.find((t) => {
    const s = slots.tiers[String(t)]
    return s.used < s.max
  })
  return tier === undefined ? null : String(tier)
}

type ActionsListProps = {
  segment: Segment
  picks: PickRecord[]
  slots: SlotsValue | undefined
  onUse: (spellLevel: number) => void
  onEmptyAction: () => void
}

export function ActionsList({ segment, picks, slots, onUse, onEmptyAction }: ActionsListProps) {
  const entries = buildEntries(picks).filter((e) => e.segment === segment)

  if (entries.length === 0) {
    return (
      <View className="items-start gap-3">
        <Text variant="body-sm" tone="muted">
          {segment === 'actions' ? 'No weapons equipped and no spells yet.' : 'Nothing here yet.'}
        </Text>
        <Button variant="outline" size="sm" onPress={onEmptyAction}>
          <Text>{segment === 'actions' ? 'Open inventory' : 'Show actions'}</Text>
        </Button>
      </View>
    )
  }

  return (
    <View className="gap-2">
      {entries.map((e) => {
        const costs = e.spellLevel !== undefined && e.spellLevel > 0
        const empty = costs && lowestTier(slots, e.spellLevel!) === null
        return (
          <View key={e.key} className="gap-1">
            <ContentCard
              title={e.title}
              meta={e.meta}
              tags={e.tags}
              action={
                costs ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    accessibilityLabel={`Use ${e.title}`}
                    disabled={empty}
                    onPress={() => onUse(e.spellLevel!)}
                  >
                    <Text>Use</Text>
                  </Button>
                ) : undefined
              }
            />
            {empty ? <Text variant="caption" tone="muted">{`No spell slots left for ${e.title}.`}</Text> : null}
          </View>
        )
      })}
    </View>
  )
}
