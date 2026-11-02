import { useId, type ReactNode } from 'react'
import { View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

const FADE_HEIGHT = 20

/**
 * Pinned action area under a scrolling body: a hairline top border and a shadow cast upward over the
 * content, so it reads as scrollable underneath. The shadow is a gradient above the footer's top edge.
 */
export function StickyFooter({ children, className }: { children: ReactNode; className?: string }) {
  const id = `footer-shadow-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  return (
    <View testID="sticky-footer" className={cn('relative border-t border-border px-4 pb-4 pt-3', className)} style={{ backgroundColor: THEME_COLORS.rockDeep }}>
      <View testID="sticky-footer-shadow" pointerEvents="none" style={{ position: 'absolute', top: -FADE_HEIGHT - 1, left: 0, right: 0, height: FADE_HEIGHT }}>
        <Svg width="100%" height={FADE_HEIGHT}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={THEME_COLORS.ink} stopOpacity={0} />
              <Stop offset="1" stopColor={THEME_COLORS.ink} stopOpacity={0.7} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height={FADE_HEIGHT} fill={`url(#${id})`} />
        </Svg>
      </View>
      {children}
    </View>
  )
}
