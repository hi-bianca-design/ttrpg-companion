import { Sword } from 'phosphor-react-native'
import { View } from 'react-native'
import { ContentCard } from '@/components/game/ContentCard'
import { EmptyState } from '@/components/game/EmptyState'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { classChoice, sameName } from '@/systems/dnd5e-2024/rules'
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
  // Weapons named in the class's mastery choices show their property; without a list (older characters) every weapon does.
  const mastered = classChoice(picks, 'weapon_mastery')
  const showsMastery = (name: string) => mastered.length === 0 || mastered.some((m) => sameName(m, name))
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
        meta: typeof props.mastery === 'string' && showsMastery(p.content.name) ? `Mastery · ${props.mastery}` : undefined,
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

/**
 * The lowest spell level that no remaining slot can pay for (every level at or above it is blocked
 * too, since a spell may use any tier at or above its level), or null when every level can be cast.
 */
export function lowestBlockedLevel(slots: SlotsValue | undefined): number | null {
  if (!slots) return null
  const tiers = Object.keys(slots.tiers).map(Number).sort((a, b) => a - b)
  let blocked: number | null = null
  for (let i = tiers.length - 1; i >= 0; i--) {
    const s = slots.tiers[String(tiers[i])]
    if (s.used < s.max) break
    blocked = tiers[i]
  }
  return blocked
}

const EMPTY: Record<Segment, { title: string; body: string; action: string }> = {
  actions: { title: 'No actions yet', body: 'Equip a weapon or learn spells to see them here.', action: 'Open inventory' },
  bonus: { title: 'Nothing here yet', body: 'No bonus actions for this character.', action: 'Show actions' },
  reactions: { title: 'Nothing here yet', body: 'No reactions for this character.', action: 'Show actions' },
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
    const copy = EMPTY[segment]
    // Outline: the tab's Long rest is its one primary button.
    return <EmptyState icon={Sword} title={copy.title} body={copy.body} actionLabel={copy.action} onAction={onEmptyAction} actionVariant="outline" />
  }

  return (
    <View className="gap-2">
      {entries.map((e) => {
        const costs = e.spellLevel !== undefined && e.spellLevel > 0
        const empty = costs && lowestTier(slots, e.spellLevel!) === null
        // Why Use is disabled is said once, under the slot cards (SpellSlotsSection), not per card.
        return (
          <ContentCard
            key={e.key}
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
        )
      })}
    </View>
  )
}
