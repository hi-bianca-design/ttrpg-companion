import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { signIn } from '@/features/auth/auth.api'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center px-6">
      <Text className="text-4xl font-bold text-legacy-primary mb-2">D&D Companion</Text>
      <Text className="text-legacy-muted mb-10">Sign in to your account</Text>

      <TextInput
        className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-3"
        placeholder="Email"
        placeholderTextColor="#6c7086"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-6"
        placeholder="Password"
        placeholderTextColor="#6c7086"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && (
        <Text className="text-legacy-red mb-4 text-center">{error}</Text>
      )}

      <TouchableOpacity
        className="bg-legacy-primary rounded-xl py-3 items-center mb-4"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#1e1e2e" />
          : <Text className="text-legacy-base font-semibold text-[#1e1e2e]">Sign In</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
        <Text className="text-legacy-muted text-center">
          Don't have an account? <Text className="text-legacy-primary">Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  )
}
