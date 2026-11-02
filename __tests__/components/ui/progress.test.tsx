import { render, screen } from '@testing-library/react-native'
import { Progress } from '@/components/ui/progress'

test('track is a square-ended ink well, the indicator is gold at the given width', () => {
  render(<Progress value={40} testID="p" />)
  const cls = screen.getByTestId('p').props.className
  expect(cls).toContain('bg-well')
  expect(cls).not.toContain('rounded-full')
  const indicator = screen.UNSAFE_root.findAll((n: { props: { className?: string } }) => String(n.props.className ?? '').includes('bg-primary'))[0]
  expect(indicator.props.style).toMatchObject({ width: '40%' })
})

test('value is clamped to 0..100', () => {
  render(<Progress value={250} testID="p" />)
  const indicator = screen.UNSAFE_root.findAll((n: { props: { className?: string } }) => String(n.props.className ?? '').includes('bg-primary'))[0]
  expect(indicator.props.style).toMatchObject({ width: '100%' })
})
