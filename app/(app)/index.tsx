import { View, Text, TouchableOpacity } from 'react-native'
import { signOut } from '@/modules/auth/auth.service'
import { useAuth } from '@/modules/auth/useAuth'

export default function HomeScreen() {
  const { user } = useAuth()

  return (
    <View className="flex-1 justify-center items-center px-6">
      <Text className="text-3xl font-bold text-primary mb-2">Welcome</Text>
      <Text className="text-muted mb-10">{user?.email}</Text>
      <TouchableOpacity
        className="bg-surface rounded-xl px-6 py-3"
        onPress={signOut}
      >
        <Text className="text-text">Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}
