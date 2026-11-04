import { useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import { Text } from '@/components/ui/text'
import { MoonHero } from './MoonHero'
import { ScreenBackground } from './ScreenBackground'

/** How long the moon takes to clear the ridge. */
export const RISE_MS = 1400
const BAR_WIDTH = 160
// Roughly the height of the sign-in form and buttons, so the moon gets the same space it gets on sign-in
// and the scene does not jump when this screen fades away.
const FORM_SPACE = 280

type LoadingScreenProps = {
  /** False for Reduce Motion: show the finished scene with a full bar. */
  animate?: boolean
}

/**
 * Cold-start screen: the sign-in scene minus the form. The moon rises from behind the ridge, the title
 * fades in as it clears, and a thin gold line fills below. It is laid out exactly like the sign-in screen's
 * top, so fading it away lands on the sign-in scene without a jump.
 */
export function LoadingScreen({ animate = true }: LoadingScreenProps) {
  const rise = useRef(new Animated.Value(animate ? 0 : 1)).current

  useEffect(() => {
    if (!animate) return
    rise.setValue(0)
    Animated.timing(rise, { toValue: 1, duration: RISE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }).start()
  }, [animate, rise])

  const titleOpacity = rise.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] })
  const barX = rise.interpolate({ inputRange: [0, 1], outputRange: [-BAR_WIDTH, 0] })

  return (
    <ScreenBackground>
      <MoonHero rise={rise} />
      <View className="items-center gap-2">
        <Animated.View style={{ opacity: titleOpacity }}>
          <Text variant="display" className="text-center">Session Zero</Text>
        </Animated.View>
        {/* Invisible stand-in for sign-in's subtitle line. */}
        <Text tone="muted" className="text-center opacity-0" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          Sign in to your account
        </Text>
      </View>
      <View style={{ height: FORM_SPACE }}>
        <View
          testID="loading-bar"
          accessibilityRole="progressbar"
          accessibilityLabel="Loading"
          className="self-center bg-muted"
          style={{ width: BAR_WIDTH, height: 2, overflow: 'hidden' }}
        >
          <Animated.View className="bg-primary" style={{ width: BAR_WIDTH, height: 2, transform: [{ translateX: barX }] }} />
        </View>
      </View>
    </ScreenBackground>
  )
}
