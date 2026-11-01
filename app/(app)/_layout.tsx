import { Tabs, useSegments } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { BookOpen, Sword, UsersThree } from 'phosphor-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TAB_LABEL_STYLE, THEME_COLORS, tabBarStyle } from '@/lib/theme'

export default function AppLayout() {
  const segments = useSegments()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const colors = THEME_COLORS[dark ? 'dark' : 'light']
  const insets = useSafeAreaInsets()
  // Hide parent tab bar when inside a character detail ([id] is segment index 2)
  const inCharacterSheet = segments[2] === '[id]'

  return (
    // No top safe-area wrapper: ScreenBackground paints the glow up under the status bar and insets its own content.
    <Tabs
      screenOptions={{
        tabBarStyle: inCharacterSheet ? { display: 'none' } : tabBarStyle(dark ? 'dark' : 'light', insets.bottom),
        // Primary green is too dim on the dark teal bar; accent-foreground keeps the active tab legible.
        tabBarActiveTintColor: dark ? colors.accentForeground : colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: TAB_LABEL_STYLE,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
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
