import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Text } from '@/components/ui/text'
import type { CharacterFull } from '@/features/characters/characters.api'
import { useCurrentUserId } from '@/features/content/content.queries'
import { toRuleInput } from '@/features/characters/picks'
import { getSystem } from '@/systems/registry'
import type { PoolValue } from '@/systems/types'

/**
 * One party member at a glance: name, class and level, hit points, conditions and the system's
 * glance chips (D&D: AC, Passive, Speed). Tap a teammate's card for the rest; tap your own to open your sheet. Read-only: only a character's owner
 * edits it, on their own Character tab.
 */
export function PartyCard({ character }: { character: CharacterFull }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const mine = character.owner_id === useCurrentUserId()
  const system = getSystem(character.system_id)
  const summary = system.rules.partySummary?.(character, toRuleInput(character.picks, character.items))
  // Only a pool has current/max to show; a system that tracks hit points as slots has its own display.
  const hp = system.resources.find((r) => r.key === 'hp')?.kind === 'pool' ? (character.resources.hp as PoolValue | undefined) : undefined
  const temp = hp?.temp ?? 0
  const className = character.picks.find((p) => p.kind === 'class')?.content?.name
  const pct = hp && hp.max > 0 ? (hp.current / hp.max) * 100 : 0

  const spoken = [
    character.name,
    className ? `${className} level ${character.level}` : `level ${character.level}`,
    hp ? `${hp.current} of ${hp.max} hit points${temp > 0 ? `, ${temp} temporary` : ''}` : null,
    character.conditions.length > 0 ? character.conditions.join(', ') : null,
    ...(summary?.glance.map((g) => `${g.label} ${g.value}`) ?? []),
  ].filter(Boolean).join(', ')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={mine ? 'Opens your character sheet' : open ? 'Hides extra details' : 'Shows extra details'}
      accessibilityState={mine ? undefined : { expanded: open }}
      onPress={() => (mine ? router.push({ pathname: '/(app)/characters/[id]', params: { id: character.id } }) : setOpen((o) => !o))}
    >
      <Card compact className="gap-2">
        <View className="gap-1">
          <Text variant="subhead" numberOfLines={1}>{character.name}</Text>
          <Text variant="body-sm" tone="muted" numberOfLines={1}>
            {className ? `${className} · Level ${character.level}` : `Level ${character.level}`}
          </Text>
        </View>
        {hp ? (
          <View className="gap-1">
            <Text variant="body-sm">{`${hp.current}/${hp.max}${temp > 0 ? ` +${temp} temp` : ''}`}</Text>
            <Progress value={pct} accessibilityLabel={`${character.name} hit points`} />
          </View>
        ) : null}
        {character.conditions.length > 0 ? (
          <View className="flex-row flex-wrap gap-1">
            {character.conditions.map((c) => <Badge key={c} variant="tinted">{c}</Badge>)}
          </View>
        ) : null}
        {summary && summary.glance.length > 0 ? (
          <View className="flex-row flex-wrap gap-1">
            {summary.glance.map((g) => <Badge key={g.key}>{`${g.label} ${g.value}`}</Badge>)}
          </View>
        ) : null}
        {open && summary && summary.more.length > 0 ? (
          <View className="flex-row flex-wrap gap-1">
            {summary.more.map((m) => <Badge key={m.key} className="max-w-full">{`${m.label} ${m.value}`}</Badge>)}
          </View>
        ) : null}
      </Card>
    </Pressable>
  )
}
