import { Pressable } from 'react-native'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

type StatTileProps = {
  label: string
  value: string | number
  sub?: string
  tone?: 'default' | 'highlight'
  onPress?: () => void
}

export function StatTile({ label, value, sub, tone = 'default', onPress }: StatTileProps) {
  const body = (
    <Card compact className={cn('items-center gap-1', tone === 'highlight' && 'border-highlight')}>
      <Text variant="label">{label}</Text>
      <Text variant="stat" numberOfLines={1} adjustsFontSizeToFit>
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
    <Pressable role="button" accessibilityLabel={label} onPress={onPress}>
      {body}
    </Pressable>
  )
}
