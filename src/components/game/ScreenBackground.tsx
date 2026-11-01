import { useColorScheme } from 'nativewind'
import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

type ScreenBackgroundProps = { children: ReactNode; scroll?: boolean }

export function ScreenBackground({ children, scroll = false }: ScreenBackgroundProps) {
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
  // Fixed screens fill the height so a child can flex (e.g. a scroll area between header and footer).
  const content = <View className={cn('gap-6 px-4 pb-8 pt-6', !scroll && 'flex-1')}>{children}</View>

  return (
    <View className="flex-1 bg-background">
      <View className="absolute inset-0" pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="screen-glow" cx="50%" cy="0%" rx="120%" ry="45%" gradientUnits="objectBoundingBox">
              <Stop offset="0" stopColor={colors.glow} stopOpacity={1} />
              <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#screen-glow)" />
        </Svg>
      </View>
      {scroll ? <ScrollView>{content}</ScrollView> : content}
    </View>
  )
}
