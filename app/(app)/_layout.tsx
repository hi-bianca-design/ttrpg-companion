import { Tabs } from 'expo-router'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#313244', borderTopColor: '#45475a' },
        tabBarActiveTintColor: '#cba6f7',
        tabBarInactiveTintColor: '#6c7086',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="characters"
        options={{ title: 'Characters', tabBarLabel: 'Characters' }}
      />
      <Tabs.Screen
        name="content"
        options={{ title: 'Content', tabBarLabel: 'Content' }}
      />
    </Tabs>
  )
}
