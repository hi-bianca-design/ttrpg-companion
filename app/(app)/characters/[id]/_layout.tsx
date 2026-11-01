import { Tabs } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { User, Sword, Backpack, Scroll } from 'phosphor-react-native'
import { THEME_COLORS } from '@/lib/theme'

export default function CharacterSheetLayout() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const colors = THEME_COLORS[dark ? 'dark' : 'light']

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.rule },
        // Primary green is too dim on the dark teal bar; accent-foreground keeps the active tab legible.
        tabBarActiveTintColor: dark ? colors.accentForeground : colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Character',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} weight="duotone" />,
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          tabBarLabel: 'Actions',
          tabBarIcon: ({ color, size }) => <Sword size={size} color={color} weight="duotone" />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color, size }) => <Backpack size={size} color={color} weight="duotone" />,
        }}
      />
      <Tabs.Screen
        name="campaign"
        options={{
          tabBarLabel: 'Campaign',
          tabBarIcon: ({ color, size }) => <Scroll size={size} color={color} weight="duotone" />,
        }}
      />
      <Tabs.Screen name="level-up" options={{ href: null }} />
    </Tabs>
  )
}
