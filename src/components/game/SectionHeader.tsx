import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { Disclosure, RuleOrnament } from '@/components/ui/ornament'
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
  // A faint gold rule runs from the title to a diamond ornament on the same row, so the header and its
  // content read as one section (a separate divider under the header read as a section break). A collapsible
  // section ends in a triangle (down while open, up once collapsed) instead of the diamond ornament.
  const rule = (
    <>
      <View testID="section-rule" className="h-px flex-1 bg-rule opacity-60" />
      {collapsible ? <Disclosure testID="section-ornament" open={!collapsed} /> : <RuleOrnament testID="section-ornament" />}
    </>
  )

  return (
    <View>
      <View className="flex-row items-center gap-3">
        {collapsible ? (
          <Pressable
            role="button"
            accessibilityLabel={title}
            accessibilityState={{ expanded: !collapsed }}
            onPress={() => toggle(id)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            className="min-h-11 flex-1 flex-row items-center gap-3"
          >
            {label}
            {rule}
          </Pressable>
        ) : (
          <>
            {label}
            {rule}
          </>
        )}
        {action}
      </View>
      {!collapsed && children != null ? <View className="mt-2">{children}</View> : null}
    </View>
  )
}
