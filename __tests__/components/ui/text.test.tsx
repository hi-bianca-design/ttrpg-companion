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

test('highlight tone uses the AA-safe highlight-text token', () => {
  render(<Text variant="stat" tone="highlight">38</Text>)
  expect(screen.getByText('38').props.className).toContain('text-highlight-text')
})

test('stat is IBM Plex Mono, not the display face (no decorative fonts on stat grids)', () => {
  render(<Text variant="stat">16</Text>)
  const cls = screen.getByText('16').props.className
  expect(cls).toContain('font-plex')
  expect(cls).toContain('text-stat')
  expect(cls).not.toContain('font-display')
})

test('eyebrow is a letter-spaced Cinzel caption in label metrics', () => {
  render(<Text variant="eyebrow">Scene</Text>)
  const cls = screen.getByText('Scene').props.className
  expect(cls).toContain('font-display-medium')
  expect(cls).toContain('text-label')
  expect(cls).toContain('uppercase')
  expect(cls).toContain('text-highlight-text')
})

test('narrative is Cormorant at body size', () => {
  render(<Text variant="narrative">The innkeeper lowers her voice.</Text>)
  const cls = screen.getByText('The innkeeper lowers her voice.').props.className
  expect(cls).toContain('font-narrative')
  expect(cls).toContain('text-body')
})
