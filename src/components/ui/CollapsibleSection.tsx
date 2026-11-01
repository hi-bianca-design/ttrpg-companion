import { ReactNode } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useUIStore } from '@/stores/ui.store'

type Props = {
  sectionKey: string
  title: string
  children: ReactNode
}

export function CollapsibleSection({ sectionKey, title, children }: Props) {
  const { isCollapsed, toggleSection } = useUIStore()
  const collapsed = isCollapsed(sectionKey)

  return (
    <View className="bg-legacy-surface rounded-xl mb-3 overflow-hidden">
      <TouchableOpacity
        onPress={() => toggleSection(sectionKey)}
        className="flex-row justify-between items-center px-4 py-3"
        activeOpacity={0.7}
      >
        <Text className="text-legacy-muted text-xs font-bold tracking-wider">{title}</Text>
        <Text className="text-legacy-muted text-lg">{collapsed ? '›' : '˅'}</Text>
      </TouchableOpacity>
      {!collapsed && <View className="px-4 pb-4">{children}</View>}
    </View>
  )
}
