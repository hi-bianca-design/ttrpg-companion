import { useId, useState } from 'react'
import { Animated, Image, PixelRatio, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Defs, G, Image as SvgImage, LinearGradient, Mask, Pattern, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg'
import { THEME_COLORS } from '@/lib/theme'
import { BACK_CREST, FRONT_CREST, GRID_H, GRID_W, LIT, ROCKS, type LitFace, type Pt } from './moonRidge'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../assets/brand/session-zero-logo.png')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GRAIN = require('../../../assets/grain.png')

// Design size: the hero's layout slot at full height. The hero fills whatever height its screen has left
// (up to SLOT) and scales the whole scene to fit, so the screen never needs to scroll.
const SLOT = 300
const MIN_SCALE = 0.5
const MOON = 168
const MOON_TOP = 16
const GLOW = 180
// The ridge reaches this far below the slot, behind the title, and is RIDGE tall in all.
const REACH = 140
const RIDGE = 260
// Same strength and tile as the screen's own grain, which the ridge would otherwise cover.
const GRAIN_OPACITY = 0.14
const GRAIN_TILE = 256


const RESTING = new Animated.Value(1)

// react-native-web has no resolveAssetSource and draws the grain tile at CSS pixels.
const isWeb = () => !Image.resolveAssetSource

type MoonHeroProps = {
  /** 0 = moon hidden behind the ridge, 1 = fully risen. Omit for the resting scene. */
  rise?: Animated.Value
}

/**
 * The sign-in and loading scene: the d20 logo as a moon over a two-layer ridge line, lit by a torch-orange
 * halo. The moon is drawn first and the ridge over it, so animating `rise` lifts it out from behind the hills.
 * Takes the height its screen has left, bleeds to the screen edges, and lets the ridge reach below its slot.
 */
export function MoonHero({ rise = RESTING }: MoonHeroProps) {
  const id = `moon-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  const window = useWindowDimensions()
  const [box, setBox] = useState<{ width: number; height: number } | null>(null)
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setBox((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }))
  }

  const width = box?.width ?? window.width
  const slot = box?.height ?? SLOT
  const scale = Math.min(1, Math.max(MIN_SCALE, slot / SLOT))
  const moonSize = MOON * scale
  const moonTop = MOON_TOP * scale
  const glow = GLOW * scale
  const reach = REACH * scale
  const ridgeH = RIDGE * scale
  const sunk = moonSize * 1.15
  const moonY = rise.interpolate({ inputRange: [0, 1], outputRange: [sunk, 0] })
  const haloOpacity = rise.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] })

  const px = ([x, y]: Pt): Pt => [(x * width) / GRID_W, (y * ridgeH) / GRID_H]
  const pts = (list: Pt[]) => list.map((p) => px(p).join(',')).join(' ')
  // Smooth closed curve through the points (Catmull-Rom turned into cubic Beziers), for soft light shapes.
  const blob = (list: Pt[], start = ''): string => {
    const p = list.map(px)
    const at = (i: number) => p[Math.min(p.length - 1, Math.max(0, i))]
    let d = start || `M${p[0][0]},${p[0][1]}`
    for (let i = 0; i < p.length - 1; i++) {
      const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`
    }
    return `${d} Z`
  }
  const litPath = (face: LitFace) => blob(face.edge, `M${face.crest.map((c) => px(c).join(',')).join(' L')} L${px(face.edge[0]).join(',')}`)
  const crest = (list: Pt[]) => pts([[0, GRID_H], ...list, [GRID_W, GRID_H]])

  const tile = isWeb() ? GRAIN_TILE : GRAIN_TILE / PixelRatio.get()

  return (
    <View testID="moon-hero" className="-mx-4 flex-1" style={{ minHeight: SLOT * MIN_SCALE, maxHeight: SLOT }} onLayout={onLayout} accessibilityRole="image" accessibilityLabel="Session Zero">
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', top: moonTop + moonSize / 2 - glow, left: 0, right: 0, alignItems: 'center', opacity: haloOpacity }}
      >
        <Svg width={glow * 2} height={glow * 2}>
          <Defs>
            <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={THEME_COLORS.torch} stopOpacity={0.45} />
              <Stop offset="0.7" stopColor={THEME_COLORS.torch} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glow} cy={glow} r={glow} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>

      <Animated.View
        style={{ position: 'absolute', top: moonTop, left: 0, right: 0, alignItems: 'center', transform: [{ translateY: moonY }] }}
      >
        <Image source={LOGO} style={{ width: moonSize, height: moonSize }} />
      </Animated.View>

      <Svg width={width} height={ridgeH} style={{ position: 'absolute', top: slot + reach - ridgeH, left: 0 }}>
        <Defs>
          {/* Each ridge is lit at its crest by the sky and deepens downward, then fades out so it melts into the night. */}
          <LinearGradient id={`${id}-back`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={THEME_COLORS.ink} stopOpacity={1} />
            <Stop offset="0.5" stopColor={THEME_COLORS.rockDeep} stopOpacity={1} />
            <Stop offset="0.8" stopColor={THEME_COLORS.rockDeep} stopOpacity={0.5} />
            <Stop offset="1" stopColor={THEME_COLORS.rockDeep} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={THEME_COLORS.rockDeep} stopOpacity={1} />
            <Stop offset="0.4" stopColor={THEME_COLORS.ink} stopOpacity={1} />
            <Stop offset="0.75" stopColor={THEME_COLORS.ink} stopOpacity={0.45} />
            <Stop offset="1" stopColor={THEME_COLORS.ink} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.5" stopColor="white" stopOpacity={1} />
            <Stop offset="1" stopColor="white" stopOpacity={0} />
          </LinearGradient>
          <Mask id={`${id}-grain-mask`} x={0} y={0} width={width} height={ridgeH}>
            <Rect x={0} y={0} width={width} height={ridgeH} fill={`url(#${id}-fade)`} />
          </Mask>
          <Pattern id={`${id}-grain`} patternUnits="userSpaceOnUse" x={0} y={0} width={tile} height={tile}>
            <SvgImage href={GRAIN} x={0} y={0} width={tile} height={tile} />
          </Pattern>
        </Defs>

        <Polygon points={crest(BACK_CREST)} fill={`url(#${id}-back)`} />
        <G mask={`url(#${id}-grain-mask)`}>
          {LIT.map((face, i) => (
            <Path key={`lit-${i}`} d={litPath(face)} fill={THEME_COLORS.secondary} fillOpacity={0.5} />
          ))}
          {ROCKS.map((rock, i) => (
            <Path key={`rock-${i}`} d={blob([...rock, rock[0]])} fill={THEME_COLORS.ink} fillOpacity={0.75} />
          ))}
        </G>
        <Polygon points={crest(FRONT_CREST)} fill={`url(#${id}-front)`} />

        <G mask={`url(#${id}-grain-mask)`} opacity={GRAIN_OPACITY}>
          <Polygon points={crest(BACK_CREST)} fill={`url(#${id}-grain)`} />
          <Polygon points={crest(FRONT_CREST)} fill={`url(#${id}-grain)`} />
        </G>
      </Svg>
    </View>
  )
}
