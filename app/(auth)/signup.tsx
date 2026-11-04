import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { signUp } from '@/features/auth/auth.api'
import { AppError } from '@/features/errors'

/** Longest username profiles.username accepts (check constraint). */
const USERNAME_MAX = 64

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; username?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmSent, setConfirmSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function handleSignUp() {
    const next = {
      email: email.trim() ? undefined : 'Enter your email',
      username: !username.trim()
        ? 'Choose a username'
        : username.trim().length > USERNAME_MAX ? `Use ${USERNAME_MAX} characters or fewer` : undefined,
      password: password ? undefined : 'Choose a password',
    }
    setErrors(next)
    setFormError(null)
    if (next.email || next.username || next.password) return
    setBusy(true)
    try {
      const data = await signUp(email.trim(), password, username.trim())
      // With email confirmation on there is no session yet; otherwise AuthProvider routes into the app.
      if (!data?.session) setConfirmSent(true)
    } catch (e: unknown) {
      if (e instanceof AppError && e.code === 'username_taken') setErrors({ username: e.message })
      else setFormError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScreenBackground scroll>
      <View className="gap-2 pt-8">
        <Text variant="display">Create account</Text>
        <Text tone="muted">Join Session Zero</Text>
      </View>

      {confirmSent ? (
        <View className="gap-3">
          <Text variant="heading">Check your email</Text>
          <Text tone="muted">We sent you a confirmation link. Open it, then sign in.</Text>
          <Button className="w-full" onPress={() => router.replace('/(auth)/login')}>
            <Text variant="subhead">Back to sign in</Text>
          </Button>
        </View>
      ) : (
        <>
          <View className="gap-4">
            <View className="gap-2">
              <Label pointed>Email</Label>
              <Input
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
              {errors.email && <Text variant="caption" tone="destructive">{errors.email}</Text>}
            </View>
            <View className="gap-2">
              <Label pointed>Username</Label>
              <Input
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoComplete="username-new"
                maxLength={USERNAME_MAX}
              />
              {errors.username && <Text variant="caption" tone="destructive">{errors.username}</Text>}
            </View>
            <View className="gap-2">
              <Label pointed>Password</Label>
              <Input
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                autoComplete="new-password"
                secureTextEntry
              />
              {errors.password && <Text variant="caption" tone="destructive">{errors.password}</Text>}
            </View>
            {formError && <Text variant="caption" tone="destructive">{formError}</Text>}
          </View>

          <View className="gap-3">
            <Button className="w-full" onPress={handleSignUp} disabled={busy}>
              <Text variant="subhead">{busy ? 'Creating…' : 'Create account'}</Text>
            </Button>
            <Button variant="ghost" className="w-full" onPress={() => router.back()}>
              <Text variant="body-sm">Already have an account? Sign in</Text>
            </Button>
          </View>
        </>
      )}
    </ScreenBackground>
  )
}
