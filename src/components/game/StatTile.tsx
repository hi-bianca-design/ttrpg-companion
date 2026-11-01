import { Pressable } from 'react-native'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'

type StatTileProps = {
  label: string
  value: string | number
  sub?: string
  tone?: 'default' | 'highlight'
  onPress?: () => void
}

export function StatTile({ label, value, sub, tone = 'default', onPress }: StatTileProps) {
  const body = (
    <Card compact className="items-center gap-1">
      <Text variant="label">{label}</Text>
      <Text variant="stat" tone={tone === 'highlight' ? 'highlight' : 'default'} numberOfLines={1} adjustsFontSizeToFit>
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
