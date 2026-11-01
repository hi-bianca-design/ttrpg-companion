import '../global.css'
import { useEffect } from 'react'
import { Text, TextInput } from 'react-native'
import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router'
import { ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import { colorScheme, useColorScheme } from 'nativewind'
import { useFonts } from 'expo-font'
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces'
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono'
import { NAV_THEME } from '@/lib/theme'
import { AuthProvider } from '@/modules/auth/AuthProvider'
import { useAuth } from '@/modules/auth/useAuth'

SplashScreen.preventAutoHideAsync()
// Theme follows the OS colour scheme.
colorScheme.set('system')

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
  const { colorScheme: scheme } = useColorScheme()
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_600SemiBold,
    IBMPlexMono_500Medium,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <ThemeProvider value={NAV_THEME[scheme === 'dark' ? 'dark' : 'light']}>
      <AuthProvider>
        <RootRedirect />
      </AuthProvider>
      <PortalHost />
    </ThemeProvider>
  )
}
