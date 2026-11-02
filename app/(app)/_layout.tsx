import { Tabs, useSegments } from 'expo-router'
import { BookOpen, Sword, User, UsersThree } from 'phosphor-react-native'
import { useState } from 'react'
import { BottomNav } from '@/components/ui/bottom-nav'
import { AccountDrawer } from '@/features/auth/AccountDrawer'
import { View } from 'react-native'

export default function AppLayout() {
  const segments = useSegments()
  const [accountOpen, setAccountOpen] = useState(false)
  // No root tab bar inside a character sheet ([id], which has its own tabs) or the character creation
  // wizard (new): leaving the wizard goes through its Back / Cancel and the discard prompt, not a tab
  // switch. Other tabs' pushed and modal-like screens (campaign detail, join, homebrew forms) keep it.
  const inCharacters = segments[1] === 'characters'
  const hideTabBar = inCharacters && (segments[2] === '[id]' || segments[2] === 'new')

  return (
    // No top safe-area wrapper: ScreenBackground paints the glow up under the status bar and insets its own content.
    <Tabs
      tabBar={(props) =>
        hideTabBar ? null : (
          <View>
            <BottomNav {...props} extra={{ label: 'Account', icon: User, onPress: () => setAccountOpen(true) }} />
            <AccountDrawer open={accountOpen} onOpenChange={setAccountOpen} />
          </View>
        )
      }
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
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
  )
}
