const config = require('../../tailwind.config.js')
test('spacing is replaced, not extended', () => {
  expect(Object.keys(config.theme.spacing).sort()).toEqual(['0','1','11','2','3','4','6','8','px'].sort())
  expect(config.theme.spacing['4']).toBe('16px')
  expect(config.theme.extend?.spacing).toBeUndefined()
})
test('font sizes are the nine roles', () => {
  expect(Object.keys(config.theme.fontSize).sort()).toEqual(['body','body-sm','caption','display','heading','label','stat','subhead','title'].sort())
  expect(config.theme.fontSize.label[0]).toBe('11px')
})
test('no gluestack scales or safelist', () => {
  expect(config.safelist).toBeUndefined()
  expect(JSON.stringify(config.theme)).not.toContain('--color-typography')
})
test('label colour is label-foreground (text-label stays the font-size role)', () => {
  const colors = config.theme.extend.colors
  expect(colors['label-foreground']).toBeDefined()
  expect(colors.label).toBeUndefined()
})
test('overlay colour token exists', () => {
  expect(config.theme.extend.colors.overlay).toBe('var(--overlay)')
})
test.each(['sky', 'plum', 'sage', 'ochre'])('resource-%s has a glow token', (tint) => {
  const c = config.theme.extend.colors[`resource-${tint}`]
  expect(c.DEFAULT).toBe(`var(--resource-${tint})`)
  expect(c.glow).toBe(`var(--resource-${tint}-glow)`)
})
