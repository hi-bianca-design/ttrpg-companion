import { usePathname } from 'expo-router'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, useWindowDimensions, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { THEME_COLORS } from '@/lib/theme'

export const WIPE_MS = 560
/** Soft edge: 3% of the screen width on each side of the line, the "Edge 3" setting from the mock. */
const FEATHER_SHARE = 0.06
/** The edge leans 15 degrees from vertical, like a film wipe (top further right than bottom). */
const LEAN_DEG = 15

/** Where the curtain starts and ends so it fully covers, then fully clears, a screen of this size. */
export function curtainGeometry(width: number, height: number) {
  const feather = Math.round(width * FEATHER_SHARE)
  const skewPad = Math.ceil((height * Math.tan((LEAN_DEG * Math.PI) / 180)) / 2) + 2
  return { feather, skewPad, solid: width + 2 * skewPad, from: -(feather + skewPad), to: width + skewPad }
}

/**
 * Diagonal wipe between screens. The navigator swaps screens instantly; this curtain is put over the
 * new screen in the same frame and slides away along a leaning, softly feathered edge, so the new
 * screen is revealed left to right. Skipped for the first screen and when Reduce Motion is on.
 */
export function WipeCurtain() {
  const path = usePathname()
  const { width, height } = useWindowDimensions()
  const geo = curtainGeometry(width, height)
  const progress = useRef(new Animated.Value(1)).current
  const previous = useRef(path)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {})
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => sub.remove()
  }, [])

  // Layout effect: cover the new screen before it is ever painted.
  useLayoutEffect(() => {
    if (previous.current === path) return
    previous.current = path
    if (reduceMotion) return
    progress.setValue(0)
    Animated.timing(progress, { toValue: 1, duration: WIPE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start()
  }, [path, reduceMotion, progress])

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [geo.from, geo.to] })
  return (
    <View testID="wipe-curtain" pointerEvents="none" importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: geo.feather + geo.solid,
          transform: [{ translateX }, { skewX: `-${LEAN_DEG}deg` }],
        }}
      >
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="wipe-edge" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={THEME_COLORS.background} stopOpacity={0} />
              <Stop offset={geo.feather / (geo.feather + geo.solid)} stopColor={THEME_COLORS.background} stopOpacity={1} />
              <Stop offset="1" stopColor={THEME_COLORS.background} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#wipe-edge)" />
        </Svg>
      </Animated.View>
    </View>
  )
}
