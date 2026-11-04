import { Tabs, useLocalSearchParams, useRouter } from 'expo-router'
import { User, Sword, Backpack, Scroll, House } from 'phosphor-react-native'
import { BottomNav } from '@/components/ui/bottom-nav'
import { NavInsetContext } from '@/components/ui/nav-inset'
import { CharacterRouteIdContext } from '@/features/characters/useCharacterRouteId'

export default function CharacterSheetLayout() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  // Leaves the character for the app Home. Pop the characters stack first, or the Characters tab would reopen on
  // this sheet (with its bar hidden and no Back, the list would be unreachable). replace, not push: opened by a
  // deep link there is no history to pop.
  const goHome = () => {
    if (router.canDismiss()) router.dismissAll()
    router.replace('/(app)')
  }

  return (
    <CharacterRouteIdContext.Provider value={id}>
      <NavInsetContext.Provider value>
        <Tabs
          tabBar={(props) => <BottomNav {...props} leading={{ label: 'Home', icon: House, onPress: goHome }} />}
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen
            name="index"
            options={{
              tabBarLabel: 'Sheet',
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
              tabBarLabel: 'Items',
              tabBarIcon: ({ color, size }) => <Backpack size={size} color={color} weight="duotone" />,
            }}
          />
          <Tabs.Screen
            name="campaign"
            options={{
              tabBarLabel: 'Party',
              tabBarIcon: ({ color, size }) => <Scroll size={size} color={color} weight="duotone" />,
            }}
          />
          <Tabs.Screen name="level-up" options={{ href: null }} />
        </Tabs>
      </NavInsetContext.Provider>
    </CharacterRouteIdContext.Provider>
  )
}
