import { useId, useState, type ReactNode } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import Svg, { Defs, G, Path, RadialGradient, Stop } from 'react-native-svg'
import { shapePath, type Shape } from '@/lib/shape-path'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

export type ThemeColorKey = keyof typeof THEME_COLORS

/** Surfaces up to this tall get pointed `hex` ends; taller ones fall back to `chamfer` (spec §4.3). */
export const HEX_MAX_HEIGHT = 56

// Layered strokes fake a soft glow (SVG has no blur on every platform): wider is fainter.
const GLOW_LAYERS: Array<[extra: number, opacity: number]> = [
  [10, 0.1],
  [6, 0.18],
  [3, 0.3],
]
const SVG_OVERFLOW = { overflow: 'visible', position: 'absolute', top: 0, left: 0 } as const

type ShapedSurfaceProps = {
  shape?: Shape | 'auto'
  fill: ThemeColorKey
  stroke: ThemeColorKey
  strokeWidth?: number
  /** Hard shadow, in px right and down. 0 turns it off. */
  shadowOffset?: number
  /** Soft glow colour; only for active/lit states. */
  glow?: ThemeColorKey
  /** Light rising from the bottom edge (hero arch cards). */
  light?: ThemeColorKey
  children?: ReactNode
  className?: string
  testID?: string
}

/**
 * A flat, outlined surface in one of the Night Vigil shapes with a hard offset shadow, drawn in SVG
 * behind its children so it looks the same on iOS, Android and web. Sizes itself from its layout.
 */
export function ShapedSurface({
  shape = 'auto',
  fill,
  stroke,
  strokeWidth = 2,
  shadowOffset = 3,
  glow,
  light,
  children,
  className,
  testID,
}: ShapedSurfaceProps) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const gradientId = `surface-light-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
  }
  const resolved: Shape = shape === 'auto' ? (size.height <= HEX_MAX_HEIGHT ? 'hex' : 'chamfer') : shape
  const d = shapePath(resolved, size.width, size.height, { inset: strokeWidth / 2 })

  return (
    <View testID={testID} onLayout={onLayout} className={cn('relative', className)}>
      <Svg width={size.width} height={size.height} pointerEvents="none" style={SVG_OVERFLOW}>
        {light ? (
          <Defs>
            <RadialGradient id={gradientId} cx="0.5" cy="1" r="0.9">
              <Stop offset="0" stopColor={THEME_COLORS[light]} stopOpacity={0.55} />
              <Stop offset="0.6" stopColor={THEME_COLORS[light]} stopOpacity={0.12} />
              <Stop offset="1" stopColor={THEME_COLORS[light]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
        ) : null}
        {shadowOffset > 0 ? (
          <Path d={d} fill={THEME_COLORS.ink} transform={`translate(${shadowOffset} ${shadowOffset})`} />
        ) : null}
        {glow ? (
          <G>
            {GLOW_LAYERS.map(([extra, opacity]) => (
              <Path
                key={extra}
                d={d}
                fill="none"
                stroke={THEME_COLORS[glow]}
                strokeWidth={strokeWidth + extra}
                strokeOpacity={opacity}
                strokeLinejoin="round"
              />
            ))}
          </G>
        ) : null}
        <Path d={d} fill={THEME_COLORS[fill]} stroke={THEME_COLORS[stroke]} strokeWidth={strokeWidth} strokeLinejoin="miter" />
        {light ? <Path d={d} fill={`url(#${gradientId})`} /> : null}
      </Svg>
      {children}
    </View>
  )
}
