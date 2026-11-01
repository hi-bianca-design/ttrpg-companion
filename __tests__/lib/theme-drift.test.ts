// THEME_COLORS (JS: navigation, SVG stops, shadows) mirrors the CSS variables in global.css.
// Both were retuned by hand before; this keeps them from drifting apart in either mode.
import fs from 'fs'
import path from 'path'
import { THEME_COLORS } from '@/lib/theme'

const css = fs.readFileSync(path.join(__dirname, '../../global.css'), 'utf8')

function varsIn(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`${selector} block not found in global.css`)
  const body = css.slice(start, css.indexOf('}', start)).replace(/\/\*[\s\S]*?\*\//g, '')
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]))
}

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
const norm = (v: string) => v.toLowerCase().replace(/\s+/g, '')

describe.each([
  ['light', ':root'],
  ['dark', '.dark:root'],
] as const)('%s mode', (mode, selector) => {
  const cssVars = varsIn(selector)

  test('every THEME_COLORS value equals its CSS variable', () => {
    const mismatches = Object.entries(THEME_COLORS[mode])
      .filter(([key, value]) => norm(cssVars[kebab(key)] ?? 'missing') !== norm(value))
      .map(([key, value]) => `${key}: theme.ts ${value} vs global.css ${cssVars[kebab(key)] ?? '(missing)'}`)
    expect(mismatches).toEqual([])
  })

  test('every CSS colour variable has a THEME_COLORS entry', () => {
    const jsKeys = new Set(Object.keys(THEME_COLORS[mode]).map(kebab))
    expect(Object.keys(cssVars).filter((k) => !jsKeys.has(k))).toEqual([])
  })
})
