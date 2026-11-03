import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import type { ComponentType, ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { NAV_BAR_GAP } from '@/components/ui/nav-inset'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'

type IconProps = { size?: number; color?: string; weight?: 'duotone' | 'regular' | 'fill' }

/** A nav item that is not a tab route (Home on the sheet bar): it runs an action and is never active. */
export type ExtraNavItem = { label: string; icon: ComponentType<IconProps>; onPress: () => void }

const ICON_SIZE = 22
// The 16px screen margin, same as every screen's content and the toast.
const SIDE_INSET = 16

type NavItemProps = {
  label: string
  active: boolean
  role: 'tab' | 'button'
  onPress: () => void
  onLongPress?: () => void
  testID?: string
  icon: (color: string) => ReactNode
}

function NavItem({ label, active, role, onPress, onLongPress, testID, icon }: NavItemProps) {
  const color = active ? THEME_COLORS.highlightText : THEME_COLORS.mutedForeground
  const content = (
    <View className="min-h-11 items-center justify-center gap-0.5 px-1 py-1">
      {icon(color)}
      <Text className={active ? 'text-caption text-highlight-text' : 'text-caption text-muted-foreground'} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
  return (
    <Pressable
      role={role}
      accessibilityLabel={label}
      accessibilityState={role === 'tab' ? { selected: active } : undefined}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      className="min-h-11 flex-1 basis-0"
    >
      {active ? (
        // The active tab is a gold-edged tablet on the glass, not a pill.
        <ShapedSurface testID="nav-active" shape="chamfer" fill="muted" stroke="rule" strokeWidth={1} shadowOffset={0}>
          {content}
        </ShapedSurface>
      ) : (
        content
      )}
    </Pressable>
  )
}

/**
 * Bottom navigation: a floating frosted-glass plate of icon-over-label tabs, lifted off the bottom edge.
 * It is absolutely positioned, so it takes no layout space; screens leave room for it through
 * `useNavInset`. Used by the root tabs and the character sheet's tabs, so both read as the same bar.
 */
export function BottomNav({
  state, descriptors, navigation, insets, leading,
}: BottomTabBarProps & { leading?: ExtraNavItem }) {
  const items = state.routes
    .map((route, index) => ({ route, index, options: descriptors[route.key].options }))
    // expo-router marks `href: null` screens with display none rather than removing them.
    .filter(({ options }) => (options.tabBarItemStyle as { display?: string } | undefined)?.display !== 'none')

  const action = (item: ExtraNavItem) => (
    <NavItem
      key={`action-${item.label}`}
      role="button"
      label={item.label}
      active={false}
      onPress={item.onPress}
      icon={(color) => <item.icon size={ICON_SIZE} color={color} weight="duotone" />}
    />
  )

  return (
    <View
      testID="bottom-nav"
      pointerEvents="box-none"
      style={{ position: 'absolute', left: SIDE_INSET, right: SIDE_INSET, bottom: NAV_BAR_GAP + insets.bottom }}
    >
      <ShapedSurface testID="bottom-nav-plate" glass="overlay" blur shape="chamfer" fill="rockDeep" stroke="border" strokeWidth={1} shadowOffset={4} className="flex-row items-center px-2 py-2">
        {leading ? action(leading) : null}
        {items.map(({ route, index, options }) => {
          const active = state.index === index
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name)
          const press = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params)
          }
          return (
            <NavItem
              key={route.key}
              role="tab"
              label={label}
              active={active}
              onPress={press}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              icon={(color) => options.tabBarIcon?.({ focused: active, color, size: ICON_SIZE })}
            />
          )
        })}
      </ShapedSurface>
    </View>
  )
}
