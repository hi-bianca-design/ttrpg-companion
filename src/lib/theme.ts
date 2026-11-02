import type { Theme } from '@react-navigation/native'

// The only place JS needs literal colours: React Navigation, SVG gradient stops,
// shadow colours. Mirrors the CSS variables in global.css — keep the two in sync.
export const THEME_COLORS = {
  background: '#0B1D20',
  foreground: '#E6D9B6',
  card: '#12212C',
  cardForeground: '#E6D9B6',
  muted: 'rgba(166, 216, 204, 0.08)',
  mutedForeground: '#C2D6CE',
  labelForeground: '#B0E0D2',
  border: 'rgba(166, 216, 204, 0.2)',
  rule: 'rgba(227, 177, 48, 0.45)',
  input: '#08141A',
  ring: '#F0902F',
  primary: '#E3B130',
  primaryForeground: '#241602',
  accentForeground: '#B0E0D2',
  secondary: '#9BD3C4',
  secondaryForeground: '#06211F',
  highlightText: '#F5D170',
  destructive: '#F7B3A2',
  destructiveForeground: '#F0B9A8',
  blood: '#B8321F',
  bloodFill: '#3A110C',
  ink: '#070F15',
  rock: '#12212C',
  rockDeep: '#0C1822',
  torch: '#F0902F',
  torchGlow: 'rgba(240, 144, 47, 0.55)',
  well: '#08141A',
  placeholder: '#6B8F8A',
  typed: '#FFE08A',
  sky1: '#185653',
  sky2: '#164F4C',
  sky3: '#134744',
  sky4: '#10403E',
  sky5: '#0E3737',
  sky6: '#0C2D2F',
  resourceSky: '#BFE0F2',
  resourceSkyGlow: 'rgba(157, 196, 222, 0.7)',
  resourcePlum: '#D79AAE',
  resourceSage: '#B5C995',
  resourceOchre: '#ECC15B',
  resourcePlumGlow: 'rgba(215, 154, 174, 0.7)',
  resourceSageGlow: 'rgba(181, 201, 149, 0.7)',
  resourceOchreGlow: 'rgba(236, 193, 91, 0.7)',
  resourceTerracotta: '#E68763',
  resourceTerracottaGlow: 'rgba(230, 135, 99, 0.7)',
  tinted: 'rgba(215, 154, 174, 0.14)',
  tintedForeground: '#D79AAE',
  tintedBorder: 'rgba(215, 154, 174, 0.35)',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const satisfies Record<string, string>

/** Posterized sky bands, top to bottom (screen background). */
export const SKY_BANDS: string[] = (['sky1', 'sky2', 'sky3', 'sky4', 'sky5', 'sky6'] as const).map((k) => THEME_COLORS[k])

// Content height of the bottom nav above the safe-area inset: a 56pt plate with 8pt above it. The toast
// floats above this.
export const TAB_BAR_CONTENT_HEIGHT = 64

const fonts: Theme['fonts'] = {
  regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
  medium: { fontFamily: 'Inter_400Regular', fontWeight: '500' },
  bold: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  heavy: { fontFamily: 'Inter_600SemiBold', fontWeight: '700' },
}

export const NAV_THEME: Theme = {
  dark: true,
  colors: {
    primary: THEME_COLORS.primary,
    background: THEME_COLORS.background,
    card: THEME_COLORS.background,
    text: THEME_COLORS.foreground,
    border: THEME_COLORS.rule,
    notification: THEME_COLORS.destructive,
  },
  fonts,
}
