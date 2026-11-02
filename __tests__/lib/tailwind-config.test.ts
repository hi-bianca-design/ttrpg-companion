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
test('a 1.5px border width token for outline buttons and chips', () => {
  expect(config.theme.extend.borderWidth['1.5']).toBe('1.5px')
})
test('terracotta resource tint (death-save failures) has a glow token', () => {
  const c = config.theme.extend.colors['resource-terracotta']
  expect(c.DEFAULT).toBe('var(--resource-terracotta)')
  expect(c.glow).toBe('var(--resource-terracotta-glow)')
})
test('tinted badge tokens exist (conditions)', () => {
  const c = config.theme.extend.colors.tinted
  expect(c.DEFAULT).toBe('var(--tinted)')
  expect(c.foreground).toBe('var(--tinted-foreground)')
  expect(c.border).toBe('var(--tinted-border)')
})
test.each(['ink', 'rock', 'torch', 'well', 'placeholder', 'typed', 'blood', 'blood-fill'])('Night Vigil colour %s maps to its CSS variable', (name) => {
  expect(config.theme.extend.colors[name]).toBe(`var(--${name})`)
})
test('secondary has a foreground', () => {
  const c = config.theme.extend.colors.secondary
  expect(c.DEFAULT).toBe('var(--secondary)')
  expect(c.foreground).toBe('var(--secondary-foreground)')
})
test('the old glow tokens are gone', () => {
  expect(config.theme.extend.colors.glow).toBeUndefined()
})
test('font families: Cinzel display, Cormorant narrative, Inter and Plex kept, no Fraunces', () => {
  const f = config.theme.fontFamily
  expect(f.display).toEqual(['Cinzel_700Bold'])
  expect(f['display-medium']).toEqual(['Cinzel_500Medium'])
  expect(f.narrative).toEqual(['CormorantGaramond_500Medium'])
  expect(f['narrative-semibold']).toEqual(['CormorantGaramond_600SemiBold'])
  expect(f['narrative-italic']).toEqual(['CormorantGaramond_400Regular_Italic'])
  expect(f.inter).toEqual(['Inter_400Regular'])
  expect(f.plex).toEqual(['IBMPlexMono_500Medium'])
  expect(JSON.stringify(f)).not.toContain('Fraunces')
})
test('the highlight fill token is gone; highlight-text stays for stat numbers', () => {
  const h = config.theme.extend.colors.highlight
  expect(h.DEFAULT).toBeUndefined()
  expect(h.foreground).toBeUndefined()
  expect(h.text).toBe('var(--highlight-text)')
})
