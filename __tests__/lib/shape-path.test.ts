import { shapePath } from '@/lib/shape-path'

const nums = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

test('hex has pointed left and right ends 14px deep', () => {
  const d = shapePath('hex', 200, 44)
  expect(d.startsWith('M14 0')).toBe(true)
  expect(d).toContain('L186 0')
  expect(d).toContain('L200 22')
  expect(d).toContain('L0 22')
  expect(d.endsWith('Z')).toBe(true)
})

test('chamfer cuts all four corners 8px', () => {
  const d = shapePath('chamfer', 200, 80)
  expect(d.startsWith('M8 0')).toBe(true)
  expect(d).toContain('L200 8')
  expect(d).toContain('L192 80')
  expect(d).toContain('L0 72')
})

test('arch peaks at the centre and its shoulders sit 54px down', () => {
  const d = shapePath('arch', 300, 200)
  expect(d).toContain('L150 0')
  expect(d.startsWith('M0 54')).toBe(true)
  expect(d).toContain('L300 54')
})

test('no size yet (width or height 0) yields an empty path', () => {
  expect(shapePath('hex', 0, 44)).toBe('')
  expect(shapePath('chamfer', 120, 0)).toBe('')
  expect(shapePath('arch', -1, -1)).toBe('')
})

test('a surface narrower than twice its point depth clamps instead of producing NaN or overshoot', () => {
  const d = shapePath('hex', 10, 44)
  expect(d).not.toContain('NaN')
  for (const [i, n] of nums(d).entries()) {
    if (i % 2 === 0) expect(n).toBeGreaterThanOrEqual(0)
    if (i % 2 === 0) expect(n).toBeLessThanOrEqual(10)
  }
})

test('inset moves the whole outline inward', () => {
  const values = nums(shapePath('hex', 200, 44, { inset: 2 }))
  const xs = values.filter((_, i) => i % 2 === 0)
  const ys = values.filter((_, i) => i % 2 === 1)
  expect(Math.min(...xs)).toBe(2)
  expect(Math.max(...xs)).toBe(198)
  expect(Math.min(...ys)).toBe(2)
  expect(Math.max(...ys)).toBe(42)
})
