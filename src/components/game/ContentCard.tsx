import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'

type ContentCardProps = {
  title: string
  meta?: string
  tags?: string[]
  icon?: ReactNode
  action?: ReactNode
  /** Row controls and helper captions that belong to this card, rendered inside it under the title row. */
  footer?: ReactNode
  onPress?: () => void
}

export function ContentCard({ title, meta, tags, icon, action, footer, onPress }: ContentCardProps) {
  const body = (
    <Card compact className="gap-3">
      <View className="flex-row items-center gap-3">
        {icon}
        <View className="flex-1 gap-1">
          <Text variant="subhead" numberOfLines={1}>
            {title}
          </Text>
          {meta ? (
            <Text variant="label" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
          {tags && tags.length > 0 ? (
            <View className="flex-row flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </View>
          ) : null}
        </View>
        {action}
      </View>
      {footer}
    </Card>
  )
  if (!onPress) return body
  return (
    <Pressable role="button" accessibilityLabel={title} onPress={onPress}>
      {body}
    </Pressable>
  )
}
