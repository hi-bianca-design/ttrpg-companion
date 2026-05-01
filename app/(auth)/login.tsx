import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { signIn } from '@/modules/auth/auth.service'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (e: unknown) {
      Alert.alert('Login failed', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center px-6">
      <Text className="text-4xl font-bold text-primary mb-2">D&D Companion</Text>
      <Text className="text-muted mb-10">Sign in to your account</Text>

      <TextInput
        className="bg-surface text-text rounded-xl px-4 py-3 mb-3"
        placeholder="Email"
        placeholderTextColor="#6c7086"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="bg-surface text-text rounded-xl px-4 py-3 mb-6"
        placeholder="Password"
        placeholderTextColor="#6c7086"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-primary rounded-xl py-3 items-center mb-4"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#1e1e2e" />
          : <Text className="text-base font-semibold text-[#1e1e2e]">Sign In</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
        <Text className="text-muted text-center">
          Don't have an account? <Text className="text-primary">Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  )
}
