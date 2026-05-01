import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { signUp } from '@/modules/auth/auth.service'

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignup() {
    if (!email || !username || !password) return
    setLoading(true)
    try {
      await signUp(email.trim(), password, username.trim())
      Alert.alert('Check your email', 'We sent you a confirmation link.')
      router.replace('/(auth)/login')
    } catch (e: unknown) {
      Alert.alert('Sign up failed', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center px-6">
      <Text className="text-4xl font-bold text-primary mb-2">Create Account</Text>
      <Text className="text-muted mb-10">Join D&D Companion</Text>

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
        className="bg-surface text-text rounded-xl px-4 py-3 mb-3"
        placeholder="Username"
        placeholderTextColor="#6c7086"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
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
        onPress={handleSignup}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#1e1e2e" />
          : <Text className="text-base font-semibold text-[#1e1e2e]">Create Account</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text className="text-muted text-center">
          Already have an account? <Text className="text-primary">Sign in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  )
}
