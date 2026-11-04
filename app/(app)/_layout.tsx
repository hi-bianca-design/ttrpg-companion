import { Tabs, useSegments } from 'expo-router'
import { BookOpen, House, Sword, UsersThree } from 'phosphor-react-native'
import { BottomNav } from '@/components/ui/bottom-nav'
import { NavInsetContext } from '@/components/ui/nav-inset'

export default function AppLayout() {
  const segments = useSegments()
  // No root tab bar inside a character sheet ([id], which has its own tabs) or the character creation
  // wizard (new): leaving the wizard goes through its Back / Cancel and the discard prompt, not a tab
  // switch. Other tabs' pushed and modal-like screens (campaign detail, join, homebrew forms) keep it.
  const inCharacters = segments[1] === 'characters'
  const hideTabBar = inCharacters && (segments[2] === '[id]' || segments[2] === 'new')

  return (
    // No top safe-area wrapper: ScreenBackground paints the glow up under the status bar and insets its own content.
    <NavInsetContext.Provider value={!hideTabBar}>
      <Tabs
        // Back from any root tab returns to Home before leaving the app.
        backBehavior="initialRoute"
        tabBar={(props) => (hideTabBar ? null : <BottomNav {...props} />)}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <House size={size} color={color} weight="duotone" />,
          }}
        />
        <Tabs.Screen name="shop" options={{ href: null }} />
        <Tabs.Screen
          name="characters"
          options={{
            title: 'Characters',
            tabBarIcon: ({ color, size }) => <Sword size={size} color={color} weight="duotone" />,
          }}
        />
        <Tabs.Screen
          name="campaigns"
          options={{
            title: 'Campaigns',
            tabBarIcon: ({ color, size }) => <UsersThree size={size} color={color} weight="duotone" />,
          }}
        />
        <Tabs.Screen
          name="content"
          options={{
            title: 'Homebrew',
            tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} weight="duotone" />,
          }}
        />
      </Tabs>
    </NavInsetContext.Provider>
  )
}
