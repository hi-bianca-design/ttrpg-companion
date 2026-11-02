import { Tabs, useLocalSearchParams } from 'expo-router'
import { User, Sword, Backpack, Scroll } from 'phosphor-react-native'
import { BottomNav } from '@/components/ui/bottom-nav'
import { CharacterRouteIdContext } from '@/features/characters/useCharacterRouteId'

export default function CharacterSheetLayout() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <CharacterRouteIdContext.Provider value={id}>
      <Tabs
        tabBar={(props) => <BottomNav {...props} />}
        screenOptions={{ headerShown: false }}
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
