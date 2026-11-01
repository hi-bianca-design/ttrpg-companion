import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { Text } from '@/components/ui/text'
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

  const label = <Text variant="label">{title}</Text>

  return (
    <View>
      <View className="flex-row items-center justify-between border-b border-rule pb-2">
        {collapsible ? (
          <Pressable
            role="button"
            accessibilityLabel={title}
            accessibilityState={{ expanded: !collapsed }}
            onPress={() => toggle(id)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            className="flex-1 flex-row items-center gap-2"
          >
            {label}
            <Text variant="label">{collapsed ? '›' : '˅'}</Text>
          </Pressable>
        ) : (
          label
        )}
        {action}
      </View>
      {!collapsed && children != null ? <View className="mt-3">{children}</View> : null}
    </View>
  )
}
