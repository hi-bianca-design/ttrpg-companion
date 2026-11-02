import { Tabs, useSegments } from 'expo-router'
import { BookOpen, Sword, UsersThree } from 'phosphor-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TAB_LABEL_STYLE, THEME_COLORS, tabBarStyle } from '@/lib/theme'

export default function AppLayout() {
  const segments = useSegments()
  const colors = THEME_COLORS
  const insets = useSafeAreaInsets()
  // No root tab bar inside a character sheet ([id], which has its own tabs) or the character creation
  // wizard (new): leaving the wizard goes through its Back / Cancel and the discard prompt, not a tab
  // switch. Other tabs' pushed and modal-like screens (campaign detail, join, homebrew forms) keep it.
  const inCharacters = segments[1] === 'characters'
  const hideTabBar = inCharacters && (segments[2] === '[id]' || segments[2] === 'new')

  return (
    // No top safe-area wrapper: ScreenBackground paints the glow up under the status bar and insets its own content.
    <Tabs
      screenOptions={{
        tabBarStyle: hideTabBar ? { display: 'none' } : tabBarStyle(insets.bottom),
        // Mint (accent-foreground) keeps the active tab legible on the bar.
        tabBarActiveTintColor: colors.accentForeground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: TAB_LABEL_STYLE,
        headerShown: false,
      }}
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
