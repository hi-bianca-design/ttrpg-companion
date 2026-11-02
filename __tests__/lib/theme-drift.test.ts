// THEME_COLORS (JS: navigation, SVG stops, shapes) mirrors the CSS variables in global.css.
// There is one palette (dark only); this keeps the two from drifting apart.
import fs from 'fs'
import path from 'path'
import { SKY_BANDS, THEME_COLORS } from '@/lib/theme'

const css = fs.readFileSync(path.join(__dirname, '../../global.css'), 'utf8')

function varsIn(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`${selector} block not found in global.css`)
  const body = css.slice(start, css.indexOf('}', start)).replace(/\/\*[\s\S]*?\*\//g, '')
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]))
}

// `sky1` ↔ `--sky-1`: digits get their own segment in CSS.
const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/([a-z])(\d)/g, '$1-$2')
const norm = (v: string) => v.toLowerCase().replace(/\s+/g, '')

const cssVars = varsIn(':root')

test('every THEME_COLORS value equals its CSS variable', () => {
  const mismatches = Object.entries(THEME_COLORS)
    .filter(([key, value]) => norm(cssVars[kebab(key)] ?? 'missing') !== norm(value))
    .map(([key, value]) => `${key}: theme.ts ${value} vs global.css ${cssVars[kebab(key)] ?? '(missing)'}`)
  expect(mismatches).toEqual([])
})

test('every CSS colour variable has a THEME_COLORS entry', () => {
  const jsKeys = new Set(Object.keys(THEME_COLORS).map(kebab))
  expect(Object.keys(cssVars).filter((k) => !jsKeys.has(k))).toEqual([])
})

test('SKY_BANDS lists sky1..sky6 top to bottom', () => {
  expect(SKY_BANDS).toEqual((['sky1', 'sky2', 'sky3', 'sky4', 'sky5', 'sky6'] as const).map((k) => THEME_COLORS[k]))
})
