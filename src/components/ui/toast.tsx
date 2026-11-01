import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { create } from 'zustand'
import { Text } from '@/components/ui/text'
import { TAB_BAR_CONTENT_HEIGHT } from '@/lib/theme'

/** How long a toast stays readable before it fades. */
export const TOAST_MS = 3000
const FADE_MS = 250
// The Toaster sits at the app root, outside any tab navigator (useBottomTabBarHeight would throw
// there), so it uses the tab bar's own height from the theme: bar + safe-area inset + an 8pt gap.
const GAP_ABOVE_TAB_BAR = 8
/** One-line toast pill: py-3 (12 + 12) around a body-sm line (20). */
const TOAST_PILL_HEIGHT = 44
/** Space the toast takes above the tab bar: the 8pt gap plus the pill. */
export const TOAST_BAND = GAP_ABOVE_TAB_BAR + TOAST_PILL_HEIGHT
/**
 * Room a screen leaves under its last control when that control fires a toast (Actions' rest
 * buttons), so the confirmation never covers what triggered it: the band plus 28pt of air.
 */
export const TOAST_CLEARANCE = 80
/** ScreenBackground's column gap (gap-6) and bottom padding (pb-8): both already sit under the last control. */
export const SCREEN_COLUMN_GAP = 24
export const SCREEN_BOTTOM_PADDING = 32

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
    <View
      pointerEvents="none"
      className="absolute left-4 right-4"
      style={{ bottom: insets.bottom + TAB_BAR_CONTENT_HEIGHT + GAP_ABOVE_TAB_BAR }}
    >
      <Animated.View style={{ opacity }}>
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
    </View>
  )
}

/**
 * Last child of a ScreenBackground column whose final control triggers a toast. Its height tops up the
 * column gap above it and the screen's bottom padding below it to TOAST_CLEARANCE.
 */
export function ToastClearance() {
  return <View testID="toast-clearance" style={{ height: TOAST_CLEARANCE - SCREEN_COLUMN_GAP - SCREEN_BOTTOM_PADDING }} />
}
