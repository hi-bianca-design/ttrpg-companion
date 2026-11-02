import type { ThemeColorKey } from '@/components/ui/shaped-surface'
import { THEME_COLORS } from '@/lib/theme'

// Type-level guard, enforced by `tsc --noEmit`: ThemeColorKey must be the literal key union, not `string`.
it('ThemeColorKey rejects unknown keys at compile time', () => {
  const ok: ThemeColorKey = 'rockDeep'
  // @ts-expect-error a typo is not a theme colour
  const bad: ThemeColorKey = 'rockdeep'
  expect(THEME_COLORS[ok]).toBeDefined()
  expect(bad).toBe('rockdeep')
})
