import { Tabs, useSegments } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BookOpen, Sword, UsersThree } from 'phosphor-react-native'
import { THEME_COLORS } from '@/lib/theme'

export default function AppLayout() {
  const segments = useSegments()
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
  // Hide parent tab bar when inside a character detail ([id] is segment index 2)
  const inCharacterSheet = segments[2] === '[id]'

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Tabs
        screenOptions={{
          tabBarStyle: inCharacterSheet
            ? { display: 'none' }
            : { backgroundColor: colors.background, borderTopColor: colors.rule },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
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
    </SafeAreaView>
  )
}
