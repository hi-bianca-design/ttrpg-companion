import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, View } from 'react-native'
import { LoadingScreen, RISE_MS } from '@/components/game/LoadingScreen'
import { useAuth } from './useAuth'

const FADE_MS = 450
const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const

/**
 * Cold-start loading screen, laid over the app until the session check has finished and the moon has had
 * time to clear the ridge. Fades away onto whichever screen RootRedirect has chosen. With Reduce Motion
 * on, it shows the finished scene and leaves as soon as the session check is done.
 */
export function BootOverlay() {
  const { loading } = useAuth()
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null)
  const [minElapsed, setMinElapsed] = useState(false)
  const [gone, setGone] = useState(false)
  const fade = useRef(new Animated.Value(1)).current

  useEffect(() => {
    let live = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => live && setReduceMotion(on))
      .catch(() => live && setReduceMotion(false))
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (reduceMotion === null) return
    if (reduceMotion) return setMinElapsed(true)
    const t = setTimeout(() => setMinElapsed(true), RISE_MS)
    return () => clearTimeout(t)
  }, [reduceMotion])

  const ready = !loading && minElapsed
  useEffect(() => {
    if (!ready) return
    Animated.timing(fade, { toValue: 0, duration: reduceMotion ? 0 : FADE_MS, useNativeDriver: true, isInteraction: false })
      .start(({ finished }) => finished && setGone(true))
  }, [ready, reduceMotion, fade])

  if (gone) return null
  return (
    <Animated.View testID="boot-overlay" pointerEvents={ready ? 'none' : 'auto'} style={[fill, { opacity: fade }]}>
      {reduceMotion === null ? <View className="flex-1 bg-background" /> : <LoadingScreen animate={!reduceMotion} />}
    </Animated.View>
  )
}
