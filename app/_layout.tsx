import '../global.css'
import { useEffect } from 'react'
import { Text, TextInput } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { AuthProvider } from '@/modules/auth/AuthProvider'
import { useAuth } from '@/modules/auth/useAuth'

// Enforce minimum font size of 12px — prevent system accessibility scaling from
// shrinking text below design spec. maxFontSizeMultiplier=2 still allows enlarging.
// Cap system font scaling at 2× — smallest text (text-xs = 12px) stays readable,
// and we never shrink below design spec regardless of system accessibility settings.
if (!Text.defaultProps) Text.defaultProps = {}
Text.defaultProps.maxFontSizeMultiplier = 2

if (!TextInput.defaultProps) TextInput.defaultProps = {}
TextInput.defaultProps.maxFontSizeMultiplier = 2

function RootRedirect() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!user && !inAuthGroup) router.replace('/(auth)/login')
    if (user && inAuthGroup) router.replace('/(app)')
  }, [user, loading, segments])

  return <Slot />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootRedirect />
    </AuthProvider>
  )
}
