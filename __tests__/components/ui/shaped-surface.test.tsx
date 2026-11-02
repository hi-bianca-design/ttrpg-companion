import { fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { StyleSheet } from 'react-native'
import Svg, { G, Path, RadialGradient } from 'react-native-svg'
import { ShapedSurface, type ThemeColorKey } from '@/components/ui/shaped-surface'
import { shapePath } from '@/lib/shape-path'
import { THEME_COLORS } from '@/lib/theme'

const layout = (id: string, width: number, height: number) =>
  fireEvent(screen.getByTestId(id), 'layout', { nativeEvent: { layout: { width, height, x: 0, y: 0 } } })

const fillPath = (fillKey: ThemeColorKey) => screen.UNSAFE_getAllByType(Path).find((p) => p.props.fill === THEME_COLORS[fillKey])

test('before any layout no path contains NaN', () => {
  render(<ShapedSurface testID="s" fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  for (const p of screen.UNSAFE_getAllByType(Path)) expect(String(p.props.d ?? '')).not.toContain('NaN')
})

test('auto shape is hex on a single line and the fill path follows the measured size', () => {
  render(<ShapedSurface testID="s" fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  layout('s', 200, 44)
  expect(fillPath('rock')?.props.d).toBe(shapePath('hex', 200, 44, { inset: 1 }))
})

test('growing past 56pt switches auto from hex to chamfer without remounting', () => {
  render(<ShapedSurface testID="s" fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  const node = screen.getByTestId('s')
  layout('s', 200, 44)
  layout('s', 200, 120)
  expect(screen.getByTestId('s')).toBe(node)
  expect(fillPath('rock')?.props.d).toBe(shapePath('chamfer', 200, 120, { inset: 1 }))
})

test('an explicit shape overrides auto', () => {
  render(<ShapedSurface testID="s" shape="arch" fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  layout('s', 300, 200)
  expect(fillPath('rock')?.props.d).toBe(shapePath('arch', 300, 200, { inset: 1 }))
})

test('the hard shadow is an ink copy of the outline offset 3px right and down, drawn first', () => {
  render(<ShapedSurface testID="s" fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  layout('s', 200, 44)
  const [shadow] = screen.UNSAFE_getAllByType(Path)
  expect(shadow.props.fill).toBe(THEME_COLORS.ink)
  expect(shadow.props.transform).toContain('translate(3 3)')
})

test('shadowOffset is configurable', () => {
  render(<ShapedSurface testID="s" shadowOffset={1} fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  layout('s', 200, 44)
  expect(screen.UNSAFE_getAllByType(Path)[0].props.transform).toContain('translate(1 1)')
})

test('glow adds soft strokes in the glow colour behind the fill', () => {
  render(<ShapedSurface testID="s" glow="torch" fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  layout('s', 200, 44)
  const glows = screen.UNSAFE_getAllByType(Path).filter((p) => p.props.stroke === THEME_COLORS.torch && p.props.fill === 'none')
  expect(glows.length).toBe(3)
})

test('two surfaces with light never share a gradient id', () => {
  render(
    <>
      <ShapedSurface testID="a" shape="arch" light="torch" fill="rock" stroke="primary"><Text>a</Text></ShapedSurface>
      <ShapedSurface testID="b" shape="arch" light="torch" fill="rock" stroke="primary"><Text>b</Text></ShapedSurface>
    </>,
  )
  const ids = screen.UNSAFE_getAllByType(RadialGradient).map((g) => g.props.id as string)
  expect(ids).toHaveLength(2)
  expect(new Set(ids).size).toBe(2)
  for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]+$/)
})

test('renders its children', () => {
  render(<ShapedSurface fill="rock" stroke="primary"><Text>Inside</Text></ShapedSurface>)
  expect(screen.getByText('Inside')).toBeTruthy()
})

test('point and rise tune the shape depth for small surfaces and sheets', () => {
  render(<ShapedSurface testID="s" point={6} fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  layout('s', 100, 20)
  expect(fillPath('rock')?.props.d).toBe(shapePath('hex', 100, 20, { inset: 1, point: 6 }))
})

test('rise sets the arch height', () => {
  render(<ShapedSurface testID="s" shape="arch" rise={24} fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  layout('s', 300, 200)
  expect(fillPath('rock')?.props.d).toBe(shapePath('arch', 300, 200, { inset: 1, rise: 24 }))
})

// Review fix C2: iOS clips an SVG to its frame, so the hard shadow and glow need room past the box.
test('the SVG extends past the measured box so the hard shadow and glow are not clipped', () => {
  render(<ShapedSurface testID="s" glow="torch" fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  layout('s', 200, 44)
  const svg = screen.UNSAFE_getByType(Svg).props
  expect(svg.width).toBe(200 + 2 * 8)
  expect(svg.height).toBe(44 + 2 * 8)
  expect(StyleSheet.flatten(svg.style)).toMatchObject({ top: -8, left: -8 })
})

test('the outline is drawn inset by the same padding, so its geometry is unchanged', () => {
  render(<ShapedSurface testID="s" fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  layout('s', 200, 44)
  const group = screen.UNSAFE_getAllByType(G).find((g) => String(g.props.transform ?? '').includes('translate(8 8)'))
  expect(group).toBeTruthy()
})

// Review fix C1: on web an unpositioned child (an icon's <svg>) paints under the absolute plate.
test('the plate sits behind all content: SVG z-index -1 inside a root stacking context', () => {
  render(<ShapedSurface testID="s" fill="rock" stroke="primary"><Text>x</Text></ShapedSurface>)
  expect(StyleSheet.flatten(screen.UNSAFE_getByType(Svg).props.style).zIndex).toBe(-1)
  expect(StyleSheet.flatten(screen.getByTestId('s').props.style).zIndex).toBe(0)
})
