import '../global.css'
import { useEffect } from 'react'
import { Text, TextInput } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SplashScreen } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import { Toaster } from '@/components/ui/toast'
import { WipeCurtain } from '@/components/ui/wipe-curtain'
import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Cinzel_500Medium, Cinzel_700Bold } from '@expo-google-fonts/cinzel'
import {
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond'
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono'
import { NAV_THEME } from '@/lib/theme'
import { installAppFocus } from '@/lib/app-focus'
import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { RootRedirect } from '@/features/auth/RootRedirect'

SplashScreen.preventAutoHideAsync()
installAppFocus()

// Cap system font scaling at 2x so layouts hold; the smallest type role (label, 11px)
// is never scaled below spec because maxFontSizeMultiplier only limits enlarging.
// React Native still reads defaultProps at runtime, but its types no longer declare it.
type WithDefaults = { defaultProps?: { maxFontSizeMultiplier?: number } }
for (const Component of [Text, TextInput] as unknown as WithDefaults[]) {
  Component.defaultProps = { ...Component.defaultProps, maxFontSizeMultiplier: 2 }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cinzel_500Medium,
    Cinzel_700Bold,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    Inter_400Regular,
    Inter_600SemiBold,
    IBMPlexMono_500Medium,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  // The battle order's drag grips are gesture-handler gestures, which need a root view (Android in particular).
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={NAV_THEME}>
        <StatusBar style="light" />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootRedirect />
          </AuthProvider>
        </QueryClientProvider>
        <WipeCurtain />
        <PortalHost />
        <Toaster />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
