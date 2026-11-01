import { render, screen } from '@testing-library/react-native'
import { Text } from '@/components/ui/text'

test('title variant uses Fraunces role', () => {
  render(<Text variant="title">Aelindra</Text>)
  const cls = screen.getByText('Aelindra').props.className
  expect(cls).toContain('text-title')
  expect(cls).toContain('font-display')
})

test('label variant is uppercase mono with label colour', () => {
  render(<Text variant="label">Armor Class</Text>)
  const cls = screen.getByText('Armor Class').props.className
  expect(cls).toContain('text-label')
  expect(cls).toContain('font-plex')
  expect(cls).toContain('uppercase')
  expect(cls).toContain('text-label-foreground')
})

test('defaults to body with foreground tone; tone overrides colour', () => {
  render(
    <>
      <Text>Plain</Text>
      <Text tone="muted">Quiet</Text>
    </>,
  )
  expect(screen.getByText('Plain').props.className).toContain('text-body')
  expect(screen.getByText('Plain').props.className).toContain('text-foreground')
  expect(screen.getByText('Quiet').props.className).toContain('text-muted-foreground')
})
