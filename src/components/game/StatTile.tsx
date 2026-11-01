import { Pressable } from 'react-native'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

type StatTileProps = {
  label: string
  value: string | number
  sub?: string
  /** highlight: ochre number. destructive: destructive border + number (e.g. HP at 0). */
  tone?: 'default' | 'highlight' | 'destructive'
  /** Defaults to "<label> <value><sub>", so the value is announced with its label. */
  accessibilityLabel?: string
  /** What pressing does; only used when the tile is pressable. */
  accessibilityHint?: string
  onPress?: () => void
}

export function StatTile({ label, value, sub, tone = 'default', accessibilityLabel, accessibilityHint, onPress }: StatTileProps) {
  const a11yLabel = accessibilityLabel ?? `${label} ${value}${sub ?? ''}`
  const body = (
    <Card
      compact
      className={cn('items-center gap-1', tone === 'destructive' && 'border-destructive')}
      accessible={!onPress}
      accessibilityLabel={onPress ? undefined : a11yLabel}
    >
      <Text variant="label">{label}</Text>
      <Text variant="stat" tone={tone} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Card>
  )
  if (!onPress) return body
  return (
    <Pressable role="button" accessibilityLabel={a11yLabel} accessibilityHint={accessibilityHint} onPress={onPress}>
      {body}
    </Pressable>
  )
}
