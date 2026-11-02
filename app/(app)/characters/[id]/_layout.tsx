import { Tabs, useLocalSearchParams } from 'expo-router'
import { User, Sword, Backpack, Scroll } from 'phosphor-react-native'
import { CharacterRouteIdContext } from '@/features/characters/useCharacterRouteId'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TAB_LABEL_STYLE, THEME_COLORS, tabBarStyle } from '@/lib/theme'

export default function CharacterSheetLayout() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const colors = THEME_COLORS
  const insets = useSafeAreaInsets()

  return (
    <CharacterRouteIdContext.Provider value={id}>
      <Tabs
        screenOptions={{
          tabBarStyle: tabBarStyle(insets.bottom),
          // Mint (accent-foreground) keeps the active tab legible on the bar.
          tabBarActiveTintColor: colors.accentForeground,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarLabelStyle: TAB_LABEL_STYLE,
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
    </CharacterRouteIdContext.Provider>
  )
}
