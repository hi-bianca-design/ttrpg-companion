import { useEffect } from 'react'
import { Platform } from 'react-native'

/**
 * NativeWind runs with `darkMode: 'class'`, so on web the `.dark:root` tokens in global.css
 * only apply when <html> carries the `dark` class. Native resolves the scheme itself.
 * Keeps that class in sync with the current colour scheme (web only).
 */
export function useDarkClassOnWeb(scheme: 'light' | 'dark' | undefined, platform: string = Platform.OS) {
  useEffect(() => {
    if (platform !== 'web' || typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', scheme === 'dark')
  }, [scheme, platform])
}
