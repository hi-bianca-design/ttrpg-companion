import { Tabs, useSegments } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Sword, BookOpen } from 'phosphor-react-native'

export default function AppLayout() {
  const segments = useSegments()
  // Hide parent tab bar when inside a character detail ([id] is segment index 2)
  const inCharacterSheet = segments[2] === '[id]'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1e1e2e' }} edges={['top']}>
      <Tabs
        screenOptions={{
          tabBarStyle: inCharacterSheet
            ? { display: 'none' }
            : { backgroundColor: '#313244', borderTopColor: '#45475a' },
          tabBarActiveTintColor: '#cba6f7',
          tabBarInactiveTintColor: '#6c7086',
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen
          name="characters"
          options={{
            title: 'Characters',
            tabBarLabel: 'Characters',
            tabBarIcon: ({ color, size }) => <Sword size={size} color={color} weight="duotone" />,
          }}
        />
        <Tabs.Screen
          name="content"
          options={{
            title: 'Content',
            tabBarLabel: 'Content',
            tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} weight="duotone" />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  )
}
