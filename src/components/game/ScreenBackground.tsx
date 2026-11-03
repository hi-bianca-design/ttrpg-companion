import { useId, useState, type ReactNode } from 'react'
import { Image, PixelRatio, ScrollView, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'
import { SKY_BANDS, THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

type ScreenBackgroundProps = { children: ReactNode; scroll?: boolean }

// The sky occupies the top 30% of the screen as six stepped bands (a posterized print, not a smooth
// gradient): five of 4.2% and a last of 9%.
const BAND_STEPS = [0, 4.2, 8.4, 12.6, 16.8, 21]
const BAND_ENDS = [4.2, 8.4, 12.6, 16.8, 21, 30]
// Below the last band the sky eases into the night over this share of the screen height, so there is no hard step.
const SKY_FADE_END = 46
const VIGNETTE_EDGE_OPACITY = 0.82
const GRAIN_OPACITY = 0.14
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GRAIN = require('../../../assets/grain.png')
// Overriding the asset's scale makes the repeat tile 1 image pixel per physical pixel, so specks stay
// fine-grained on 2x and 3x screens instead of growing to 2x2 or 3x3 physical pixels.
// react-native-web has no resolveAssetSource and draws the tile at CSS pixels, so it keeps the plain asset.
const grainSource = (): ImageSourcePropType => {
  const resolved = Image.resolveAssetSource?.(GRAIN)
  return resolved ? { ...resolved, scale: PixelRatio.get() } : GRAIN
}

/**
 * Screen root: flat night background, posterized sky bands, a vignette that frames a lit centre, the
 * safe-area top inset applied to the content, and film grain between the backdrop and the content (never over text). Each instance owns its
 * gradient id: web keeps several screens mounted, and a shared id would resolve to a hidden screen's.
 */
export function ScreenBackground({ children, scroll = false }: ScreenBackgroundProps) {
  // Measured, not '100%': on iOS a percent-sized Svg kept the height it first had when the tab bar below it
  // resized the screen, leaving a lighter unpainted strip at the bottom.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }))
  }
  const vignetteId = `screen-vignette-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  const skyFadeId = `${vignetteId}-sky-fade`
  // Fixed screens fill the height so a child can flex (e.g. a scroll area between header and footer).
  const content = <View className={cn('gap-8 px-4 pb-8 pt-6', !scroll && 'flex-1')}>{children}</View>

  return (
    <View testID="screen-background" className="flex-1 bg-background" onLayout={onLayout}>
      <View className="absolute inset-0" pointerEvents="none">
        {size ? (
          <Svg width={size.width} height={size.height}>
            <Defs>
              <RadialGradient id={vignetteId} cx="0.5" cy="0.4" r="0.75" gradientUnits="objectBoundingBox">
                <Stop offset="0.5" stopColor={THEME_COLORS.ink} stopOpacity={0} />
                <Stop offset="1" stopColor={THEME_COLORS.ink} stopOpacity={VIGNETTE_EDGE_OPACITY} />
              </RadialGradient>
              <LinearGradient id={skyFadeId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={SKY_BANDS[SKY_BANDS.length - 1]} stopOpacity={1} />
                <Stop offset="1" stopColor={THEME_COLORS.background} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            {SKY_BANDS.map((fill, i) => (
              <Rect
                key={fill}
                x={0}
                y={(BAND_STEPS[i] / 100) * size.height}
                width={size.width}
                height={((BAND_ENDS[i] - BAND_STEPS[i]) / 100) * size.height}
                fill={fill}
              />
            ))}
            <Rect
              x={0}
              y={(BAND_ENDS[BAND_ENDS.length - 1] / 100) * size.height}
              width={size.width}
              height={((SKY_FADE_END - BAND_ENDS[BAND_ENDS.length - 1]) / 100) * size.height}
              fill={`url(#${skyFadeId})`}
            />
            <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${vignetteId})`} />
          </Svg>
        ) : null}
      </View>
      <View testID="screen-grain" className="absolute inset-0" pointerEvents="none" style={{ opacity: GRAIN_OPACITY }}>
        <Image source={grainSource()} resizeMode="repeat" style={{ width: '100%', height: '100%' }} />
      </View>
      <SafeAreaView edges={['top']} className="flex-1">
        {scroll ? <ScrollView>{content}</ScrollView> : content}
      </SafeAreaView>
    </View>
  )
}
