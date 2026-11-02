import { render, screen } from '@testing-library/react-native'
import { StyleSheet, Text } from 'react-native'
import { Card } from '@/components/ui/card'
import { ShapedSurface } from '@/components/ui/shaped-surface'

const surface = () => screen.UNSAFE_getByType(ShapedSurface).props

test('flat card is a chamfered rock plate with a hairline edge and no light', () => {
  render(<Card><Text>x</Text></Card>)
  expect(surface().shape).toBe('chamfer')
  expect(surface().fill).toBe('card')
  expect(surface().stroke).toBe('border')
  expect(surface().strokeWidth).toBe(1)
  expect(surface().light).toBeUndefined()
})

test('hero card is a soft-edged arch with torch light rising inside', () => {
  render(<Card variant="hero"><Text>x</Text></Card>)
  expect(surface().shape).toBe('arch')
  expect(surface().stroke).toBe('border')
  expect(surface().strokeWidth).toBe(1)
  expect(surface().light).toBe('torch')
})

test('hero content clears the arch point', () => {
  render(<Card variant="hero" testID="c"><Text>x</Text></Card>)
  expect(StyleSheet.flatten(screen.getByTestId('c').props.style).paddingTop).toBeGreaterThanOrEqual(54)
})

test('destructive tone redraws the edge', () => {
  render(<Card tone="destructive"><Text>x</Text></Card>)
  expect(surface().stroke).toBe('destructive')
})

test('placement classes go on the plate, padding and gap on the content', () => {
  render(<Card testID="c" className="mt-2 gap-3 items-center"><Text>x</Text></Card>)
  expect(surface().className).toContain('mt-2')
  expect(surface().className).not.toContain('gap-3')
  const cls = screen.getByTestId('c').props.className
  expect(cls).toContain('gap-3')
  expect(cls).toContain('items-center')
  expect(cls).toContain('p-4')
})

test('compact is tighter, and other View props reach the content', () => {
  render(<Card compact testID="c" accessibilityLabel="Stat"><Text>x</Text></Card>)
  expect(screen.getByTestId('c').props.className).toContain('p-3')
  expect(screen.getByTestId('c').props.accessibilityLabel).toBe('Stat')
})

test('flex-row is content layout, not plate placement', () => {
  render(<Card testID="c" className="flex-row items-center justify-between gap-3"><Text>x</Text></Card>)
  expect(screen.getByTestId('c').props.className).toContain('flex-row')
  expect(surface().className ?? '').not.toContain('flex-row')
})

// Review fix I1: a selected choice card needs its gold edge back (border-* classes no longer reach a plate).
test('selected tone draws a mint edge with a soft glow', () => {
  render(<Card tone="selected"><Text>x</Text></Card>)
  expect(surface().stroke).toBe('secondary')
  expect(surface().strokeWidth).toBe(1.5)
  expect(surface().glow).toBe('secondary')
})

test('accent tone is a chamfered plate with a thin, translucent gold edge and no glow', () => {
  render(<Card tone="accent"><Text>x</Text></Card>)
  expect(surface().shape).toBe('chamfer')
  expect(surface().stroke).toBe('rule')
  expect(surface().strokeWidth).toBe(1)
  expect(surface().glow).toBeUndefined()
  expect(surface().light).toBeUndefined()
})

test('opacity classes dim the plate, not just the inner content', () => {
  render(<Card testID="c" className="opacity-50 gap-2"><Text>x</Text></Card>)
  expect(surface().className).toContain('opacity-50')
  expect(screen.getByTestId('c').props.className).not.toContain('opacity-50')
})

test('cards are frosted glass', () => {
  render(<Card><Text>x</Text></Card>)
  expect(surface().glass).toBe(true)
})
