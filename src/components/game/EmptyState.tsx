import { useColorScheme } from 'nativewind'
import type { Icon } from 'phosphor-react-native'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'

type EmptyStateProps = {
  icon: Icon
  title: string
  body: string
  /** One call to action; omit when the screen header already offers it. */
  actionLabel?: string
  onAction?: () => void
}

/** The one empty-state layout: centred duotone icon, display title, muted body, one full-width button. */
export function EmptyState({ icon: IconComponent, title, body, actionLabel, onAction }: EmptyStateProps) {
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
  return (
    <View className="items-center gap-4 pt-8">
      <IconComponent size={48} color={colors.accentForeground} weight="duotone" />
      <View className="items-center gap-2">
        <Text variant="display" className="text-center">{title}</Text>
        <Text variant="body-sm" tone="muted" className="text-center">{body}</Text>
      </View>
      {actionLabel && onAction ? (
        <Button className="w-full" onPress={onAction}>
          <Text>{actionLabel}</Text>
        </Button>
      ) : null}
    </View>
  )
}
