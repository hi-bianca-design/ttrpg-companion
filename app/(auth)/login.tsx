import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { signIn } from '@/features/auth/auth.api'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function handleSignIn() {
    const emailMissing = !email.trim()
    const passwordMissing = !password
    setEmailError(emailMissing ? 'Enter your email' : null)
    setPasswordError(passwordMissing ? 'Enter your password' : null)
    setFormError(null)
    if (emailMissing || passwordMissing) return
    setBusy(true)
    try {
      await signIn(email.trim(), password)
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScreenBackground scroll>
      <View className="gap-2 pt-8">
        <Text variant="display">D&D Companion</Text>
        <Text tone="muted">Sign in to your account</Text>
      </View>

      <View className="gap-4">
        <View className="gap-2">
          <Label>Email</Label>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          {emailError && <Text variant="caption" tone="destructive">{emailError}</Text>}
        </View>
        <View className="gap-2">
          <Label>Password</Label>
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
            secureTextEntry
          />
          {passwordError && <Text variant="caption" tone="destructive">{passwordError}</Text>}
        </View>
        {formError && <Text variant="caption" tone="destructive">{formError}</Text>}
      </View>

      <View className="gap-3">
        <Button className="w-full" onPress={handleSignIn} disabled={busy}>
          <Text variant="subhead">{busy ? 'Signing in…' : 'Sign in'}</Text>
        </Button>
        <Button variant="ghost" className="w-full" onPress={() => router.push('/(auth)/signup')}>
          <Text variant="body-sm">No account yet? Create one</Text>
        </Button>
      </View>
    </ScreenBackground>
  )
}
