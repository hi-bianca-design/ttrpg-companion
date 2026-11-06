import { render, screen } from '@testing-library/react-native'
import { Badge } from '@/components/ui/badge'
import { ShapedSurface } from '@/components/ui/shaped-surface'

const plate = () => screen.getByTestId('badge-plate').props.className as string

test.each([
  ['default', 'bg-card', 'border-border'],
  ['accent', 'bg-primary', 'border-ink'],
  ['tinted', 'bg-tinted', 'border-tinted-border'],
] as const)('%s badge is a plain small-radius rectangle: %s fill, %s edge', (variant, fill, edge) => {
  render(<Badge variant={variant}>Fire</Badge>)
  expect(plate()).toContain(fill)
  expect(plate()).toContain(edge)
  expect(plate()).toContain('rounded-sm')
})

test('a badge draws no SVG plate, so a list of them measures and redraws nothing', () => {
  render(<Badge>Fire</Badge>)
  expect(screen.UNSAFE_queryByType(ShapedSurface)).toBeNull()
})

test('label text keeps the per-variant colour', () => {
  render(<Badge variant="accent">Fire</Badge>)
  expect(screen.getByText('Fire').props.className).toContain('text-primary-foreground')
})
