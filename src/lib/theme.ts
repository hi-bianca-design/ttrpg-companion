import type { Theme } from '@react-navigation/native'

// The only place JS needs literal colours: React Navigation, SVG gradient stops,
// shadow colours. Mirrors the CSS variables in global.css — keep the two in sync.
export const THEME_COLORS: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    background: '#FBF8F3',
    glow: '#F3DDA0',
    glowMid: '#EDE6C8',
    glowFade: '#F6F1E6',
    foreground: '#1E1A12',
    card: '#F0EAE0',
    cardForeground: '#1E1A12',
    muted: '#F0EAE0',
    mutedForeground: '#726755',
    labelForeground: '#736858',
    border: 'rgba(63, 122, 84, 0.16)',
    rule: '#E5DDD0',
    input: '#E9E1D3',
    ring: '#3F7A54',
    primary: '#3F7A54',
    primaryForeground: '#FBF8F3',
    accentForeground: '#3C7551',
    highlight: '#E8B547',
    highlightForeground: '#1E1A12',
    highlightText: '#8F5E0E',
    destructive: '#D96A47',
    destructiveForeground: '#1E1A12',
    resourceSky: '#4F8FB8',
    resourceSkyGlow: 'rgba(79, 143, 184, 0.55)',
    resourcePlum: '#8B4A5E',
    resourceSage: '#7A9A55',
    resourceOchre: '#E8B547',
    resourcePlumGlow: 'rgba(139, 74, 94, 0.55)',
    resourceSageGlow: 'rgba(122, 154, 85, 0.55)',
    resourceOchreGlow: 'rgba(232, 181, 71, 0.55)',
    overlay: 'rgba(14, 12, 8, 0.6)',
  },
  dark: {
    background: '#173832',
    glow: '#5A5F36',
    glowMid: '#24433D',
    glowFade: '#112D28',
    foreground: '#F5E4C3',
    card: 'rgba(245, 228, 195, 0.06)',
    cardForeground: '#F5E4C3',
    muted: 'rgba(245, 228, 195, 0.06)',
    mutedForeground: '#A9BFB4',
    labelForeground: '#8FB3A6',
    border: 'rgba(245, 228, 195, 0.10)',
    rule: 'rgba(245, 228, 195, 0.14)',
    input: 'rgba(245, 228, 195, 0.10)',
    ring: '#5B9268',
    primary: '#5B9268',
    primaryForeground: '#0D221E',
    accentForeground: '#B5C995',
    highlight: '#ECC15B',
    highlightForeground: '#1E1A12',
    highlightText: '#ECC15B',
    destructive: '#E68763',
    destructiveForeground: '#1E1A12',
    resourceSky: '#BFE0F2',
    resourceSkyGlow: 'rgba(157, 196, 222, 0.7)',
    resourcePlum: '#D79AAE',
    resourceSage: '#B5C995',
    resourceOchre: '#ECC15B',
    resourcePlumGlow: 'rgba(215, 154, 174, 0.7)',
    resourceSageGlow: 'rgba(181, 201, 149, 0.7)',
    resourceOchreGlow: 'rgba(236, 193, 91, 0.7)',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
}

// Top-of-screen glow stops [offset, THEME_COLORS key], exactly the approved mockup's
// radial-gradient(120% 45% at 50% 0%, …) in each mode (blend-v4.html).
export const GLOW_STOPS: Record<'light' | 'dark', Array<[number, string]>> = {
  light: [[0, 'glow'], [0.22, 'glowMid'], [0.5, 'glowFade'], [0.75, 'background']],
  dark: [[0, 'glow'], [0.38, 'glowMid'], [0.7, 'background'], [1, 'glowFade']],
}

// Tab bar labels get the caption role's 12/16 metrics. React Navigation's default bar is 49pt plus
// the bottom inset; on web (no inset) the 24pt icon and 16pt label don't fit inside its padding and
// the label is squeezed and clipped, so the bar's content height is 56pt.
export const TAB_LABEL_STYLE = { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 } as const
const TAB_BAR_CONTENT_HEIGHT = 56

export function tabBarStyle(mode: 'light' | 'dark', bottomInset: number) {
  const c = THEME_COLORS[mode]
  return { backgroundColor: c.background, borderTopColor: c.rule, height: TAB_BAR_CONTENT_HEIGHT + bottomInset }
}

const fonts: Theme['fonts'] = {
  regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
  medium: { fontFamily: 'Inter_400Regular', fontWeight: '500' },
  bold: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  heavy: { fontFamily: 'Inter_600SemiBold', fontWeight: '700' },
}

function navTheme(mode: 'light' | 'dark'): Theme {
  const c = THEME_COLORS[mode]
  return {
    dark: mode === 'dark',
    colors: {
      primary: c.primary,
      background: c.background,
      card: c.background,
      text: c.foreground,
      border: c.rule,
      notification: c.destructive,
    },
    fonts,
  }
}

export const NAV_THEME: { light: Theme; dark: Theme } = {
  light: navTheme('light'),
  dark: navTheme('dark'),
}
