import type { Theme } from '@react-navigation/native'

// The only place JS needs literal colours: React Navigation, SVG gradient stops,
// shadow colours. Mirrors the CSS variables in global.css — keep the two in sync.
export const THEME_COLORS: Record<string, string> = {
  background: '#0B1D20',
  foreground: '#E6D9B6',
  card: '#12212C',
  cardForeground: '#E6D9B6',
  muted: 'rgba(166, 216, 204, 0.08)',
  mutedForeground: '#9FB8B0',
  labelForeground: '#9BD3C4',
  border: 'rgba(166, 216, 204, 0.28)',
  rule: 'rgba(227, 177, 48, 0.45)',
  input: '#08141A',
  ring: '#F0902F',
  primary: '#E3B130',
  primaryForeground: '#241602',
  accentForeground: '#9BD3C4',
  secondary: '#9BD3C4',
  secondaryForeground: '#06211F',
  highlight: '#9BD3C4',
  highlightForeground: '#06211F',
  highlightText: '#E3B130',
  destructive: '#E8806A',
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
  sky1: '#1D6560',
  sky2: '#1B5D59',
  sky3: '#175350',
  sky4: '#134744',
  sky5: '#0F3A3A',
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
}

/** Posterized sky bands, top to bottom (screen background). */
export const SKY_BANDS: string[] = ['sky1', 'sky2', 'sky3', 'sky4', 'sky5', 'sky6'].map((k) => THEME_COLORS[k])

// Tab bar labels get the caption role's 12/16 metrics. React Navigation's default bar is 49pt plus
// the bottom inset; on web (no inset) the 24pt icon and 16pt label don't fit inside its padding and
// the label is squeezed and clipped, so the bar's content height is 56pt.
export const TAB_LABEL_STYLE = { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 } as const
export const TAB_BAR_CONTENT_HEIGHT = 56

export function tabBarStyle(bottomInset: number) {
  const c = THEME_COLORS
  return { backgroundColor: c.background, borderTopColor: c.rule, height: TAB_BAR_CONTENT_HEIGHT + bottomInset }
}

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
