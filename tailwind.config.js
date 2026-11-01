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
      display: ['Fraunces_600SemiBold'],
      sans: ['Inter_400Regular'],
      'sans-semibold': ['Inter_600SemiBold'],
      mono: ['IBMPlexMono_500Medium'],
    },
    extend: {
      colors: {
        background: token('background'),
        glow: token('glow'),
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
        highlight: { DEFAULT: token('highlight'), foreground: token('highlight-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        'resource-sky': { DEFAULT: token('resource-sky'), glow: token('resource-sky-glow') },
        'resource-plum': token('resource-plum'),
        'resource-sage': token('resource-sage'),
        'resource-ochre': token('resource-ochre'),
        // Old Catppuccin names for un-migrated screens. Deleted in Task 20.
        legacy: {
          base: '#1e1e2e',
          mantle: '#181825',
          crust: '#11111b',
          surface: '#313244',
          overlay: '#45475a',
          text: '#cdd6f4',
          subtext: '#bac2de',
          muted: '#6c7086',
          primary: '#cba6f7',
          red: '#f38ba8',
          yellow: '#f9e2af',
          blue: '#89b4fa',
          green: '#a6e3a1',
          teal: '#94e2d5',
          pink: '#f5c2e7',
          peach: '#fab387',
        },
      },
    },
  },
}
