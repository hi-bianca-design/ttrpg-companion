import { Pressable, View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Text } from '@/components/ui/text'
import { TEMP_HP_LABEL } from './copy'
import type { PlayerRow } from './battleOrder'

/** The turn marker, never colour alone: a symbol, and `Current` as text. */
export function CurrentMark() {
  return (
    <View className="flex-row items-center gap-1">
      <Text variant="body-sm" tone="accent">▶</Text>
      <Text variant="label" tone="accent">Current</Text>
    </View>
  )
}

export const initText = (n: number | null) => (n === null ? 'init –' : `init ${n}`)

/**
 * A party member in the battle order: name, class and level, initiative, hit points as text and a bar,
 * conditions. Read-only unless the caller passes `onPress` and children (the player's own row mounts its
 * HP entry that way). Hit points come from the party cache via the view model, never from the order.
 */
export function PlayerRowCard({ row, onPress, expanded, children }: { row: PlayerRow; onPress?: () => void; expanded?: boolean; children?: React.ReactNode }) {
  const hp = row.hp
  const down = !!hp && hp.current === 0
  const spoken = [
    row.name,
    row.isMine ? 'you' : null,
    hp ? `${hp.current} of ${hp.max} hit points${hp.temp > 0 ? `, ${hp.temp} temporary` : ''}` : null,
    down ? 'down' : null,
    row.initiative === null ? null : `initiative ${row.initiative}`,
    row.conditions.length > 0 ? row.conditions.join(', ') : null,
    row.isCurrent ? 'current turn' : null,
  ].filter(Boolean).join(', ')

  const body = (
    <Card compact tone={row.isCurrent ? 'selected' : 'default'} className="gap-2">
      <View className="flex-row items-center gap-2">
        <View className="flex-1 gap-1">
          <Text variant="subhead" numberOfLines={1}>{row.name}</Text>
          {row.subtitle ? <Text variant="body-sm" tone="muted" numberOfLines={1}>{row.subtitle}</Text> : null}
        </View>
        <Text variant="label" tone="muted">{initText(row.initiative)}</Text>
      </View>
      {row.isCurrent ? <CurrentMark /> : null}
      {hp ? (
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <Text variant="body-sm">{`${hp.current}/${hp.max}`}</Text>
            {hp.temp > 0 ? <Text variant="body-sm" tone="muted">{`+${hp.temp} ${TEMP_HP_LABEL}`}</Text> : null}
            {down ? <Text variant="label">Down</Text> : null}
          </View>
          <Progress value={hp.max > 0 ? (hp.current / hp.max) * 100 : 0} accessibilityLabel={`${row.name} hit points`} />
        </View>
      ) : null}
      {row.conditions.length > 0 ? (
        <View className="flex-row flex-wrap gap-1">
          {row.conditions.map((c) => <Badge key={c} variant="tinted">{c}</Badge>)}
        </View>
      ) : null}
      {children}
    </Card>
  )
  if (!onPress) return <View accessible accessibilityLabel={spoken}>{body}</View>
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={spoken} accessibilityState={{ expanded: !!expanded }} onPress={onPress}>
      {body}
    </Pressable>
  )
}
