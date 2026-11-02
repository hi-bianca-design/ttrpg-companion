/** @type {import('tailwindcss').Config} */
const token = (name) => `var(--${name})`

module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    // Replaced, not extended: only these spacing values exist (spec §4.3).
    spacing: {
      0: '0px',
      px: '1px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      6: '24px',
      8: '32px',
      11: '44px', // touch-target heights only
    },
    // Replaced: the nine type roles (spec §4.4).
    fontSize: {
      display: ['32px', { lineHeight: '38px' }],
      title: ['24px', { lineHeight: '30px' }],
      heading: ['20px', { lineHeight: '26px' }],
      subhead: ['16px', { lineHeight: '22px' }],
      body: ['16px', { lineHeight: '24px' }],
      'body-sm': ['14px', { lineHeight: '20px' }],
      stat: ['24px', { lineHeight: '28px' }],
      label: ['11px', { lineHeight: '14px', letterSpacing: '0.88px' }],
      caption: ['12px', { lineHeight: '16px' }],
    },
    borderRadius: {
      sm: '8px',
      card: '16px',
      sheet: '20px',
      full: '999px',
    },
    fontFamily: {
      display: ['Cinzel_700Bold'],
      'display-medium': ['Cinzel_500Medium'],
      narrative: ['CormorantGaramond_500Medium'],
      'narrative-semibold': ['CormorantGaramond_600SemiBold'],
      'narrative-italic': ['CormorantGaramond_400Regular_Italic'],
      // NativeWind special-cases the default font-sans/font-mono keys and drops custom families on native, so these have their own names.
      inter: ['Inter_400Regular'],
      'sans-semibold': ['Inter_600SemiBold'],
      plex: ['IBMPlexMono_500Medium'],
    },
    extend: {
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        'label-foreground': token('label-foreground'),
        border: token('border'),
        rule: token('rule'),
        input: token('input'),
        ring: token('ring'),
        overlay: token('overlay'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        accent: { foreground: token('accent-foreground') },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        blood: token('blood'),
        'blood-fill': token('blood-fill'),
        ink: token('ink'),
        rock: token('rock'),
        torch: token('torch'),
        well: token('well'),
        placeholder: token('placeholder'),
        typed: token('typed'),
        highlight: { text: token('highlight-text') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        'resource-sky': { DEFAULT: token('resource-sky'), glow: token('resource-sky-glow') },
        'resource-plum': { DEFAULT: token('resource-plum'), glow: token('resource-plum-glow') },
        'resource-sage': { DEFAULT: token('resource-sage'), glow: token('resource-sage-glow') },
        'resource-ochre': { DEFAULT: token('resource-ochre'), glow: token('resource-ochre-glow') },
        'resource-terracotta': { DEFAULT: token('resource-terracotta'), glow: token('resource-terracotta-glow') },
        tinted: { DEFAULT: token('tinted'), foreground: token('tinted-foreground'), border: token('tinted-border') },
      },
      // One stroke weight for outline buttons and toggle chips.
      borderWidth: { '1.5': '1.5px' },
    },
  },
}
