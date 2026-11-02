// Spec §2/§8: the old look must not survive outside src/components/ui/ (and the tailwind-merge radius config in lib/utils.ts).
import fs from 'fs'
import path from 'path'

const root = path.join(__dirname, '../..')

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return walk(p)
    return /\.tsx?$/.test(e.name) ? [p] : []
  })
}

const screens = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'src'))].filter((f) => !f.includes(`${path.sep}components${path.sep}ui${path.sep}`) && !f.endsWith(`${path.sep}lib${path.sep}utils.ts`))

test.each([
  ['Fraunces', /Fraunces/],
  ['the removed highlight button variant', /variant="highlight"/],
  ['the removed highlight fill token', /\bbg-highlight\b/],
  ['the old 1.5px outline stroke', /border-1\.5/],
  ['pill and card radii (shapes come from ShapedSurface)', /\brounded-(full|card|sheet)\b/],
])('no screen or feature uses %s', (_name, pattern) => {
  const hits = screens.filter((f) => pattern.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f))
  expect(hits).toEqual([])
})

// Card and Input draw their edge and fill in SVG; border-*/bg-* classes passed to them are silently ignored.
test('no screen passes border-* or bg-* classes to Card or Input', () => {
  const pattern = /<(?:Card|Input)\b[^>]*?\bclassName=(?:"[^"]*|\{[^}]*)\b(?:border|bg)-/
  const hits = screens.filter((f) => pattern.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f))
  expect(hits).toEqual([])
})
