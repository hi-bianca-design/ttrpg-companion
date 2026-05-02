import { Tabs } from 'expo-router'

export default function CharacterSheetLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#313244', borderTopColor: '#45475a' },
        tabBarActiveTintColor: '#cba6f7',
        tabBarInactiveTintColor: '#6c7086',
        headerShown: false,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index"     options={{ tabBarLabel: 'Overview' }} />
      <Tabs.Screen name="skills"    options={{ tabBarLabel: 'Skills' }} />
      <Tabs.Screen name="actions"   options={{ tabBarLabel: 'Actions' }} />
      <Tabs.Screen name="inventory" options={{ tabBarLabel: 'Inventory' }} />
      <Tabs.Screen name="notes"     options={{ tabBarLabel: 'Notes' }} />
    </Tabs>
  )
}
