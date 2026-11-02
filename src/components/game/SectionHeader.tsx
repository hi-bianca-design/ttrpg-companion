import { CaretDown, CaretRight } from 'phosphor-react-native'
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { SpireDivider } from '@/components/ui/spire-divider'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'
import { useSectionStore } from './section-store'

type SectionHeaderProps = {
  id: string
  title: string
  collapsible?: boolean
  action?: ReactNode
  children?: ReactNode
}

export function SectionHeader({ id, title, collapsible = false, action, children }: SectionHeaderProps) {
  const collapsed = useSectionStore((s) => collapsible && (s.collapsed[id] ?? false))
  const toggle = useSectionStore((s) => s.toggle)

  const iconColor = THEME_COLORS.labelForeground
  const Chevron = collapsed ? CaretRight : CaretDown

  const label = <Text variant="label">{title}</Text>

  return (
    <View>
      <View className="flex-row items-center justify-between">
        {collapsible ? (
          <Pressable
            role="button"
            accessibilityLabel={title}
            accessibilityState={{ expanded: !collapsed }}
            onPress={() => toggle(id)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            className="min-h-11 flex-1 flex-row items-center gap-2"
          >
            {label}
            <Chevron testID="icon-chevron" size={16} color={iconColor} />
          </Pressable>
        ) : (
          label
        )}
        {action}
      </View>
      <SpireDivider className="mt-2" />
      {!collapsed && children != null ? <View className="mt-3">{children}</View> : null}
    </View>
  )
}
