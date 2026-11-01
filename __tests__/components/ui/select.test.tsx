import { render, screen } from '@testing-library/react-native'
import { Select, SelectItem, SelectValue } from '@/components/ui/select'

test('SelectValue styles the selected value', () => {
  render(
    <Select value={{ value: 'a', label: 'Alpha' }}>
      <SelectValue placeholder="Pick" />
    </Select>,
  )
  const cls = screen.getByText('Alpha').props.className
  expect(cls).toContain('font-sans')
  expect(cls).toContain('text-body')
  expect(cls).toContain('text-foreground')
})

test('SelectValue placeholder is muted', () => {
  render(
    <Select>
      <SelectValue placeholder="Pick" />
    </Select>,
  )
  expect(screen.getByText('Pick').props.className).toContain('text-muted-foreground')
})

test('SelectItem label is styled', () => {
  render(
    <Select>
      <SelectItem value="a" label="Alpha" />
    </Select>,
  )
  const cls = screen.getByText('Alpha').props.className
  expect(cls).toContain('font-sans')
  expect(cls).toContain('text-body')
  expect(cls).toContain('text-foreground')
})
