// Spec §5: the app is dark only. No OS-theme following, no light/dark palettes left behind.
import fs from 'fs'
import path from 'path'
import { THEME_COLORS } from '@/lib/theme'

const root = path.join(__dirname, '../..')

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return walk(p)
    return /\.(ts|tsx|css)$/.test(e.name) ? [p] : []
  })
}

const files = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'src')), path.join(root, 'global.css')]

test.each(['useColorScheme', 'colorScheme.set', '.dark:root', 'useDarkClassOnWeb'])('nothing references %s', (needle) => {
  const hits = files.filter((f) => fs.readFileSync(f, 'utf8').includes(needle)).map((f) => path.relative(root, f))
  expect(hits).toEqual([])
})

test('THEME_COLORS is one flat palette', () => {
  expect(THEME_COLORS).not.toHaveProperty('light')
  expect(THEME_COLORS).not.toHaveProperty('dark')
  expect(typeof THEME_COLORS.background).toBe('string')
})

test('app.json forces the dark interface style', () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
  expect(app.expo.userInterfaceStyle).toBe('dark')
})
