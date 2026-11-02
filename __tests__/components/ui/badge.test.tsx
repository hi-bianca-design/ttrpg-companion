import { render, screen } from '@testing-library/react-native'
import { Badge } from '@/components/ui/badge'
import { ShapedSurface } from '@/components/ui/shaped-surface'

const plate = () => screen.UNSAFE_getByType(ShapedSurface).props

test.each([
  ['default', 'card', 'border'],
  ['accent', 'primary', 'ink'],
  ['tinted', 'tinted', 'tintedBorder'],
] as const)('%s badge is a small pointed plate: fill %s, stroke %s, no shadow', (variant, fill, stroke) => {
  render(<Badge variant={variant}>Fire</Badge>)
  expect(plate().fill).toBe(fill)
  expect(plate().stroke).toBe(stroke)
  expect(plate().shadowOffset).toBe(0)
  expect(plate().point).toBe(6)
})

test('label text keeps the per-variant colour', () => {
  render(<Badge variant="accent">Fire</Badge>)
  expect(screen.getByText('Fire').props.className).toContain('text-primary-foreground')
})
