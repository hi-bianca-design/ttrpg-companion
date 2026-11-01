import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { create } from 'zustand'
import { Text } from '@/components/ui/text'

/** How long a toast stays readable before it fades. */
export const TOAST_MS = 3000
const FADE_MS = 250
// Clears the tab bars (56pt content, see theme.tabBarStyle) plus a 16pt gap.
const BOTTOM_OFFSET = 72

type ToastState = { message: string | null; seq: number; show: (message: string) => void; hide: (seq: number) => void }

const useToastStore = create<ToastState>((set) => ({
  message: null,
  seq: 0,
  show: (message) => set((s) => ({ message, seq: s.seq + 1 })),
  // Only the toast that scheduled the hide may clear it (a newer one restarts the timer).
  hide: (seq) => set((s) => (s.seq === seq ? { message: null } : s)),
}))

/** One shared, lightweight confirmation: "Long rest: …", "Added Rope ×3." Replaces any toast showing. */
export function showToast(message: string) {
  useToastStore.getState().show(message)
}

/** Mounted once at the app root. Inverse ink surface, bottom of the screen above the tab bar, no touch handling. */
export function Toaster() {
  const message = useToastStore((s) => s.message)
  const seq = useToastStore((s) => s.seq)
  const hide = useToastStore((s) => s.hide)
  const insets = useSafeAreaInsets()
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!message) return
    const useNativeDriver = Platform.OS !== 'web'
    opacity.setValue(0)
    Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver }).start()
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(message)
    const fade = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver }).start(), TOAST_MS - FADE_MS)
    const done = setTimeout(() => hide(seq), TOAST_MS)
    return () => { clearTimeout(fade); clearTimeout(done) }
  }, [seq])

  if (!message) return null
  return (
    <Animated.View
      pointerEvents="none"
      style={{ opacity, position: 'absolute', left: 16, right: 16, bottom: insets.bottom + BOTTOM_OFFSET }}
    >
      <View
        role="status"
        accessible
        accessibilityLabel={message}
        accessibilityLiveRegion="polite"
        className="self-center rounded-card bg-foreground px-4 py-3"
      >
        <Text variant="body-sm" className="text-center text-background">{message}</Text>
      </View>
    </Animated.View>
  )
}
