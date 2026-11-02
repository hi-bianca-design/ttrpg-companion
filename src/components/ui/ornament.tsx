import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { THEME_COLORS } from '@/lib/theme'

const diamond = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z`

/**
 * End of a section rule: a large diamond between two small ones. Filled when the section is open,
 * hollow when it is collapsed, so a collapsible header needs no caret.
 */
export function RuleOrnament({ open = true, testID }: { open?: boolean; testID?: string }) {
  const gold = THEME_COLORS.primary
  return (
    <View testID={testID} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <Svg width={40} height={16} viewBox="0 0 40 16">
        <Path d={diamond(6, 8, 3)} fill={gold} opacity={0.6} />
        <Path d={diamond(20, 8, 6)} fill={open ? gold : 'none'} stroke={gold} strokeWidth={1.5} />
        <Path d={diamond(34, 8, 3)} fill={gold} opacity={0.6} />
      </Svg>
    </View>
  )
}

/** Disclosure triangle: points down while the content is shown, up once it is collapsed. */
export function Disclosure({ open, testID }: { open: boolean; testID?: string }) {
  return (
    <View testID={testID} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <Path d={open ? 'M2 4 L14 4 L8 12 Z' : 'M2 12 L14 12 L8 4 Z'} fill={THEME_COLORS.primary} />
      </Svg>
    </View>
  )
}

/**
 * Back arrow drawn as a heraldic pointer: a barbed head, a long shaft and a diamond pommel.
 * Stroke and fill are passed in because SVG cannot read the text colour.
 */
export function BackGlyph({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" testID="back-glyph">
      <Path d="M3 13 L10 6.5 L10 10.4 L18 10.4 L18 15.6 L10 15.6 L10 19.5 Z" fill={color} />
      <Path d={diamond(22, 13, 2.2)} fill={color} />
    </Svg>
  )
}
