import { useColorScheme } from 'nativewind'
import { useId, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { GLOW_STOPS, THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

type ScreenBackgroundProps = { children: ReactNode; scroll?: boolean }

// Mockup: radial-gradient(120% 45% at 50% 0%). Browsers ignore rx/ry on <radialGradient>, so the
// ellipse is a unit circle at top-centre scaled in bounding-box space instead.
const GLOW_TRANSFORM = 'translate(0.5 0) scale(1.2 0.45) translate(-0.5 0)'

/**
 * Screen root: background colour, the top glow (painted under the status bar), and the safe-area
 * top inset applied to the content. Each instance owns its gradient id — web keeps several screens
 * mounted, and a shared id would resolve to a hidden screen's gradient.
 */
export function ScreenBackground({ children, scroll = false }: ScreenBackgroundProps) {
  const { colorScheme } = useColorScheme()
  const mode = colorScheme === 'dark' ? 'dark' : 'light'
  const colors = THEME_COLORS[mode]
  const gradientId = `screen-glow-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  // Fixed screens fill the height so a child can flex (e.g. a scroll area between header and footer).
  const content = <View className={cn('gap-6 px-4 pb-8 pt-6', !scroll && 'flex-1')}>{children}</View>

  return (
    <View className="flex-1 bg-background">
      <View className="absolute inset-0" pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient
              id={gradientId}
              cx="0.5"
              cy="0"
              r="1"
              gradientUnits="objectBoundingBox"
              gradientTransform={GLOW_TRANSFORM}
            >
              {GLOW_STOPS[mode].map(([offset, key]) => (
                <Stop key={offset} offset={offset} stopColor={colors[key]} stopOpacity={1} />
              ))}
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
      </View>
      <SafeAreaView edges={['top']} className="flex-1">
        {scroll ? <ScrollView>{content}</ScrollView> : content}
      </SafeAreaView>
    </View>
  )
}
