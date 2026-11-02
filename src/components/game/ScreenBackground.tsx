import { useId, type ReactNode } from 'react'
import { Image, PixelRatio, ScrollView, View, type ImageSourcePropType } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { SKY_BANDS, THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

type ScreenBackgroundProps = { children: ReactNode; scroll?: boolean }

// The sky occupies the top 30% of the screen as six stepped bands (a posterized print, not a smooth
// gradient): five of 4.2% and a last of 9%.
const BAND_STEPS = [0, 4.2, 8.4, 12.6, 16.8, 21]
const BAND_ENDS = [4.2, 8.4, 12.6, 16.8, 21, 30]
const VIGNETTE_EDGE_OPACITY = 0.82
const GRAIN_OPACITY = 0.3
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
  const vignetteId = `screen-vignette-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  // Fixed screens fill the height so a child can flex (e.g. a scroll area between header and footer).
  const content = <View className={cn('gap-6 px-4 pb-8 pt-6', !scroll && 'flex-1')}>{children}</View>

  return (
    <View className="flex-1 bg-background">
      <View className="absolute inset-0" pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={vignetteId} cx="0.5" cy="0.4" r="0.75" gradientUnits="objectBoundingBox">
              <Stop offset="0.5" stopColor={THEME_COLORS.ink} stopOpacity={0} />
              <Stop offset="1" stopColor={THEME_COLORS.ink} stopOpacity={VIGNETTE_EDGE_OPACITY} />
            </RadialGradient>
          </Defs>
          {SKY_BANDS.map((fill, i) => (
            <Rect key={fill} x="0" y={`${BAND_STEPS[i]}%`} width="100%" height={`${BAND_ENDS[i] - BAND_STEPS[i]}%`} fill={fill} />
          ))}
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${vignetteId})`} />
        </Svg>
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
