import { Tabs } from 'expo-router'
import { User, Sword, Backpack, Scroll } from 'phosphor-react-native'

export default function CharacterSheetLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#313244', borderTopColor: '#45475a' },
        tabBarActiveTintColor: '#cba6f7',
        tabBarInactiveTintColor: '#6c7086',
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12 },
      }}
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
  )
}
