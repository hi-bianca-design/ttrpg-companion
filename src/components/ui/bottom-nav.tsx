import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import type { ComponentType } from 'react'
import { Pressable, View } from 'react-native'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

type IconProps = { size?: number; color?: string; weight?: 'duotone' | 'regular' | 'fill' }

/** An action tab that is not a route (e.g. Account, which opens a drawer over the current screen). */
export type ExtraNavItem = { label: string; icon: ComponentType<IconProps>; onPress: () => void }

type NavItemProps = {
  label: string
  active: boolean
  role: 'tab' | 'button'
  onPress: () => void
  onLongPress?: () => void
  testID?: string
  icon: (color: string) => React.ReactNode
}

function NavItem({ label, active, role, onPress, onLongPress, testID, icon }: NavItemProps) {
  const color = active ? THEME_COLORS.accentForeground : THEME_COLORS.mutedForeground
  return (
    <Pressable
      role={role}
      accessibilityLabel={label}
      accessibilityState={role === 'tab' ? { selected: active } : undefined}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-1 basis-0"
    >
      {/* Only the icon sits in a soft pill when active, so labels never have to fit inside it. */}
      <View className="items-center gap-1 py-1">
        <View testID={active ? 'nav-pill' : undefined} className={cn('items-center rounded-full px-4 py-1', active && 'bg-muted')}>
          {icon(color)}
        </View>
        <Text className={cn('text-caption', active ? 'text-accent-foreground' : 'text-muted-foreground')} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

/**
 * Bottom navigation: a plain bar of icon-over-label tabs; the active icon rests in a soft pill.
 * Used by the app's root tabs and the character sheet's tabs, so both read as the same bar.
 */
export function BottomNav({ state, descriptors, navigation, insets, extra }: BottomTabBarProps & { extra?: ExtraNavItem }) {
  const items = state.routes
    .map((route, index) => ({ route, index, options: descriptors[route.key].options }))
    // expo-router marks `href: null` screens with display none rather than removing them.
    .filter(({ options }) => (options.tabBarItemStyle as { display?: string } | undefined)?.display !== 'none')

  return (
    <View
      testID="bottom-nav"
      className="flex-row items-center border-t border-border px-2 pt-2"
      style={{ backgroundColor: THEME_COLORS.rockDeep, paddingBottom: Math.max(insets.bottom, 8) }}
    >
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
            icon={(color) => options.tabBarIcon?.({ focused: active, color, size: 24 })}
          />
        )
      })}
      {extra ? (
        <NavItem
          role="button"
          label={extra.label}
          active={false}
          onPress={extra.onPress}
          icon={(color) => <extra.icon size={24} color={color} weight="duotone" />}
        />
      ) : null}
    </View>
  )
}

