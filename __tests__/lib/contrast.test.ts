// Spec §6: body and typed text 7:1, large text / placeholder / button labels 4.5:1.
import { THEME_COLORS as C } from '@/lib/theme'
import { colorDistance, contrastRatio } from '../helpers/contrast'

const ratio = (fg: string, bg: string) => contrastRatio(C[fg], C[bg], C.background)

test.each([
  ['foreground', 'background', 7],
  ['foreground', 'card', 7],
  ['foreground', 'rock', 7],
  ['mutedForeground', 'card', 7],
  ['typed', 'well', 7],
  ['placeholder', 'well', 4.5],
  ['primaryForeground', 'primary', 4.5],
  ['secondaryForeground', 'secondary', 4.5],
  ['destructiveForeground', 'bloodFill', 4.5],
  ['accentForeground', 'rock', 4.5],
  ['labelForeground', 'rock', 4.5],
  ['highlightText', 'rock', 4.5],
] as const)('%s on %s is at least %s:1', (fg, bg, min) => {
  expect(ratio(fg, bg)).toBeGreaterThanOrEqual(min)
})

test.each(['sky1', 'sky2', 'sky3', 'sky4', 'sky5', 'sky6'])('foreground text on %s holds 4.5:1', (band) => {
  expect(ratio('foreground', band)).toBeGreaterThanOrEqual(4.5)
})

const TINTS = ['resourceSky', 'resourcePlum', 'resourceSage', 'resourceOchre', 'resourceTerracotta']

test.each(TINTS)('%s reads at 3:1 on the background', (tint) => {
  expect(ratio(tint, 'background')).toBeGreaterThanOrEqual(3)
})

test('the five resource tints are mutually distinguishable', () => {
  for (const [i, a] of TINTS.entries()) {
    for (const b of TINTS.slice(i + 1)) expect([a, b, colorDistance(C[a], C[b]) >= 40]).toEqual([a, b, true])
  }
})

// Review fix I3: subtitles, labels, gold numbers and inline errors also sit over the top bands.
test.each(['sky1', 'sky2', 'sky3', 'sky4', 'sky5', 'sky6'])('muted, label, accent, gold and error text hold 4.5:1 on %s', (band) => {
  for (const fg of ['mutedForeground', 'labelForeground', 'accentForeground', 'highlightText', 'destructive']) {
    expect([fg, ratio(fg, band) >= 4.5]).toEqual([fg, true])
  }
})
