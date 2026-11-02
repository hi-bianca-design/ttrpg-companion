import { View } from 'react-native'
import Svg, { Polygon } from 'react-native-svg'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

/** A gold hairline with a small centred spire; replaces the plain rule under screen headers. */
export function SpireDivider({ className }: { className?: string }) {
  return (
    <View testID="spire-divider" className={cn('flex-row items-center gap-2', className)}>
      <View className="h-px flex-1 bg-rule" />
      <Svg width={10} height={8}>
        <Polygon points="5,0 10,8 0,8" fill={THEME_COLORS.primary} />
      </Svg>
      <View className="h-px flex-1 bg-rule" />
    </View>
  )
}
