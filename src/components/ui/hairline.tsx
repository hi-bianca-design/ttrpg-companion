import { useId } from 'react'
import { View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

/**
 * A 1px rule in pale teal, fainter than a plate border, that fades out at its edges so it reads as a
 * hairline inside a section instead of a hard divider. `end` fades only the trailing edge (a header
 * rule running into a control).
 */
export function Hairline({ className, fade = 'both', testID }: { className?: string; fade?: 'both' | 'end'; testID?: string }) {
  const id = `hairline-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  const tint = THEME_COLORS.labelForeground
  return (
    <View testID={testID} pointerEvents="none" className={cn('h-px w-full', className)}>
      <Svg width="100%" height={1}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={tint} stopOpacity={fade === 'both' ? 0 : 0.3} />
            <Stop offset={fade === 'both' ? 0.5 : 0.4} stopColor={tint} stopOpacity={0.3} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={1} fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}
