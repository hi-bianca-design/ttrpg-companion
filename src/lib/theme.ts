import type { Theme } from '@react-navigation/native'

// The only place JS needs literal colours: React Navigation, SVG gradient stops,
// shadow colours. Mirrors the CSS variables in global.css — keep the two in sync.
export const THEME_COLORS: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    background: '#FBF8F3',
    glow: '#F3DDA0',
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
    destructive: '#D96A47',
    destructiveForeground: '#1E1A12',
    resourceSky: '#4F8FB8',
    resourceSkyGlow: 'rgba(79, 143, 184, 0.55)',
    resourcePlum: '#8B4A5E',
    resourceSage: '#7A9A55',
    resourceOchre: '#E8B547',
  },
  dark: {
    background: '#173832',
    glow: '#5A5F36',
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
    destructive: '#E68763',
    destructiveForeground: '#1E1A12',
    resourceSky: '#BFE0F2',
    resourceSkyGlow: 'rgba(157, 196, 222, 0.7)',
    resourcePlum: '#D79AAE',
    resourceSage: '#B5C995',
    resourceOchre: '#ECC15B',
  },
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
