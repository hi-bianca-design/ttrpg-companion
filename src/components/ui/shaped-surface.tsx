import { useId, useState, type ReactNode } from 'react'
import { Platform, View, type LayoutChangeEvent, type ViewStyle } from 'react-native'
import Svg, { Defs, G, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { shapePath, type Shape } from '@/lib/shape-path'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

export type ThemeColorKey = keyof typeof THEME_COLORS
/** A plate can also be invisible (inactive tabs) without unmounting its content. */
export type PlateColor = ThemeColorKey | 'transparent'

const plateColor = (c: PlateColor) => (c === 'transparent' ? 'transparent' : THEME_COLORS[c])

/**
 * Fill opacity of a glass plate. Web also blurs the page behind it, so it can be fainter; native has no
 * clippable blur (expo-blur cannot be masked to the hex/chamfer/arch shape), so it stays more opaque.
 */
export const GLASS_FILL_OPACITY = {
  // Cards and the tabs track sit on the page background.
  surface: { web: 0.42, native: 0.58 },
  // Dialogs, sheets and the toast float over arbitrary content, so they stay denser.
  overlay: { web: 0.75, native: 0.92 },
  // The placeholder is the dimmest text (4.5:1 needs >= 0.74 over the lightest sky band).
  field: { web: 0.8, native: 0.85 },
} as const
export type GlassLevel = keyof typeof GLASS_FILL_OPACITY
const GLASS_BLUR_PX = 10

/** Surfaces up to this tall get pointed `hex` ends; taller ones fall back to `chamfer` (spec §4.3). */
export const HEX_MAX_HEIGHT = 56

// Layered strokes fake a soft glow (SVG has no blur on every platform): wider is fainter.
const GLOW_LAYERS: Array<[extra: number, opacity: number]> = [
  [10, 0.1],
  [6, 0.18],
  [3, 0.3],
]
// iOS clips an SVG to its frame, so the SVG is larger than the box by this much on every side and the
// shapes are drawn translated by it: room for the 3px hard shadow and the glow's soft edge.
const SVG_PAD = 8
// zIndex -1 inside a root with zIndex 0 (a stacking context) puts the plate behind every child on web,
// including unpositioned ones such as icon <svg>s; native only uses zIndex to order siblings.
const SVG_STYLE = { position: 'absolute', top: -SVG_PAD, left: -SVG_PAD, zIndex: -1, overflow: 'visible' } as const
const ROOT_STYLE = { zIndex: 0 } as const
// Until onLayout reports a size the plate is 0x0, so hide the whole surface for that one frame
// (it keeps its layout space, so lists don't jump) rather than flash text without its plate.
const UNMEASURED_STYLE = { zIndex: 0, opacity: 0 } as const

type ShapedSurfaceProps = {
  shape?: Shape | 'auto'
  fill: PlateColor
  stroke: PlateColor
  strokeWidth?: number
  /** Depth of the pointed ends on `hex` (default 14); small surfaces like badges use less. */
  point?: number
  /** Height of the arch top (default 54); sheets use a shallower one. */
  rise?: number
  /** Hard shadow, in px right and down. 0 turns it off. */
  shadowOffset?: number
  /** Soft glow colour; only for active/lit states. */
  glow?: ThemeColorKey
  /** Light rising from the bottom edge (hero arch cards). */
  light?: ThemeColorKey
  /** Frosted glass: translucent fill, blurred backdrop on web, hard shadow kept out of the fill. */
  glass?: boolean | GlassLevel
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
  point,
  rise,
  shadowOffset = 3,
  glow,
  light,
  glass,
  children,
  className,
  testID,
}: ShapedSurfaceProps) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [measured, setMeasured] = useState(false)
  const gradientId = `surface-light-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setMeasured(true)
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
  }
  const web = Platform.OS === 'web'
  const fillOpacity = glass ? GLASS_FILL_OPACITY[glass === true ? 'surface' : glass][web ? 'web' : 'native'] : undefined
  const maskId = `${gradientId}-shadow`
  const resolved: Shape = shape === 'auto' ? (size.height <= HEX_MAX_HEIGHT ? 'hex' : 'chamfer') : shape
  const d = shapePath(resolved, size.width, size.height, { inset: strokeWidth / 2, point, rise })

  return (
    <View testID={testID} onLayout={onLayout} style={measured ? ROOT_STYLE : UNMEASURED_STYLE} className={cn('relative', className)}>
      {glass && web && measured ? (
        <View
          testID={testID ? `${testID}-backdrop` : undefined}
          pointerEvents="none"
          // backdrop-filter and clip-path are CSS-only; the clip is the plate outline, so the blur ends at its edge.
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            zIndex: -1,
            backdropFilter: `blur(${GLASS_BLUR_PX}px)`,
            WebkitBackdropFilter: `blur(${GLASS_BLUR_PX}px)`,
            clipPath: `path('${d}')`,
          } as ViewStyle}
        />
      ) : null}
      <Svg width={size.width + 2 * SVG_PAD} height={size.height + 2 * SVG_PAD} pointerEvents="none" style={SVG_STYLE}>
        {glass && shadowOffset > 0 ? (
          <Defs>
            <Mask id={maskId} x={-SVG_PAD} y={-SVG_PAD} width={size.width + 2 * SVG_PAD} height={size.height + 2 * SVG_PAD}>
              <Rect x={-SVG_PAD} y={-SVG_PAD} width={size.width + 2 * SVG_PAD} height={size.height + 2 * SVG_PAD} fill="white" />
              <Path d={d} fill="black" />
            </Mask>
          </Defs>
        ) : null}
        {light ? (
          <Defs>
            <RadialGradient id={gradientId} cx="0.5" cy="1" r="0.9">
              <Stop offset="0" stopColor={THEME_COLORS[light]} stopOpacity={0.55} />
              <Stop offset="0.6" stopColor={THEME_COLORS[light]} stopOpacity={0.12} />
              <Stop offset="1" stopColor={THEME_COLORS[light]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
        ) : null}
        <G transform={`translate(${SVG_PAD} ${SVG_PAD})`}>
          {shadowOffset > 0 ? (
            <G mask={glass ? `url(#${maskId})` : undefined}>
              <Path d={d} fill={THEME_COLORS.ink} transform={`translate(${shadowOffset} ${shadowOffset})`} />
            </G>
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
          <Path d={d} fill={plateColor(fill)} fillOpacity={fillOpacity} stroke={plateColor(stroke)} strokeWidth={strokeWidth} strokeLinejoin="miter" />
          {light ? <Path d={d} fill={`url(#${gradientId})`} /> : null}
        </G>
      </Svg>
      {children}
    </View>
  )
}
