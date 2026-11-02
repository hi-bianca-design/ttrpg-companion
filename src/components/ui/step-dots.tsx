import { useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import { THEME_COLORS } from '@/lib/theme'

const DOT = 8
const PILL = 32
const SLIDE_MS = 260
// Each step is its own route, so the row remounts per step. The step last shown seeds the pill's
// starting position, which lets the pill slide from the previous step to this one.
let lastShown: number | null = null

function Dot({ i, index }: { i: number; index: number }) {
  const startsAsPill = (lastShown ?? index) === i
  const width = useRef(new Animated.Value(startsAsPill ? PILL : DOT)).current
  const lit = useRef(new Animated.Value(i <= (lastShown ?? index) ? 1 : 0)).current

  useEffect(() => {
    const config = { duration: SLIDE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }
    Animated.parallel([
      Animated.timing(width, { toValue: i === index ? PILL : DOT, ...config }),
      Animated.timing(lit, { toValue: i <= index ? 1 : 0, ...config }),
    ]).start()
  }, [i, index, width, lit])

  // Done and current steps are gold; upcoming ones are a faint rule colour.
  const backgroundColor = lit.interpolate({ inputRange: [0, 1], outputRange: [THEME_COLORS.rule, THEME_COLORS.primary] })
  return <Animated.View testID={i === index ? 'progress-pill' : 'progress-dot'} className="h-2 rounded-full" style={{ width, backgroundColor }} />
}


/** A row of dots; the current step is a longer gold pill that slides along when the step changes. */
export function StepDots({ index, total }: { index: number; total: number }) {
  useEffect(() => {
    lastShown = index
  }, [index])
  return (
    <View className="flex-row items-center gap-2">
      {Array.from({ length: total }, (_, i) => <Dot key={i} i={i} index={index} />)}
    </View>
  )
}
