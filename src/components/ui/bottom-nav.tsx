import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import type { ComponentType } from 'react'
import { Pressable, View } from 'react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
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
      {/* The active tab is a lit glass pill; inactive ones keep an invisible plate so nothing shifts. */}
      <ShapedSurface
        glass={active ? 'surface' : undefined}
        shape="hex"
        point={10}
        fill={active ? 'rock' : 'transparent'}
        stroke={active ? 'secondary' : 'transparent'}
        strokeWidth={1}
        shadowOffset={0}
        glow={active ? 'secondary' : undefined}
        className="h-12 items-center justify-center gap-1"
      >
        {icon(color)}
        <Text className={cn('font-display-medium text-caption uppercase tracking-wide', active ? 'text-accent-foreground' : 'text-muted-foreground')} numberOfLines={1}>
          {label}
        </Text>
      </ShapedSurface>
    </Pressable>
  )
}

/**
 * Bottom navigation: one frosted-glass plate holding every tab, the active one raised as a lit pill.
 * Used by the app's root tabs and the character sheet's tabs, so both read as the same bar.
 */
export function BottomNav({ state, descriptors, navigation, insets, extra }: BottomTabBarProps & { extra?: ExtraNavItem }) {
  const items = state.routes
    .map((route, index) => ({ route, index, options: descriptors[route.key].options }))
    // expo-router marks `href: null` screens with display none rather than removing them.
    .filter(({ options }) => (options.tabBarItemStyle as { display?: string } | undefined)?.display !== 'none')

  return (
    <View className="px-3 pt-2" style={{ backgroundColor: THEME_COLORS.sky6, paddingBottom: Math.max(insets.bottom, 8) }}>
      <ShapedSurface glass="surface" shape="chamfer" fill="rockDeep" stroke="border" strokeWidth={1} shadowOffset={0} className="flex-row items-center gap-1 p-1">
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
              icon={(color) => options.tabBarIcon?.({ focused: active, color, size: 22 })}
            />
          )
        })}
        {extra ? (
          <NavItem
            role="button"
            label={extra.label}
            active={false}
            onPress={extra.onPress}
            icon={(color) => <extra.icon size={22} color={color} weight="duotone" />}
          />
        ) : null}
      </ShapedSurface>
    </View>
  )
}

