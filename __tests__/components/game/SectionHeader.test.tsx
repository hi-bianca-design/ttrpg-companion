import { fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'

test('collapsible hides children and remembers by id', () => {
  const ui = (
    <SectionHeader id="hp" title="Hit points" collapsible>
      <Text>child</Text>
    </SectionHeader>
  )
  const first = render(ui)
  expect(screen.getByText('child')).toBeTruthy()
  fireEvent.press(screen.getByLabelText('Hit points'))
  expect(screen.queryByText('child')).toBeNull()
  first.unmount()
  render(ui)
  expect(screen.queryByText('child')).toBeNull()
})

test('non-collapsible always shows children', () => {
  render(
    <SectionHeader id="fixed" title="Fixed">
      <Text>child</Text>
    </SectionHeader>,
  )
  expect(screen.getByText('child')).toBeTruthy()
})

test('collapsible header meets the 44pt touch target and shows a chevron icon', () => {
  render(
    <SectionHeader id="touch" title="Touch" collapsible>
      <Text>child</Text>
    </SectionHeader>,
  )
  const cls = screen.getByLabelText('Touch').props.className
  expect(cls).toContain('min-h-11')
  expect(screen.getByTestId('icon-chevron')).toBeTruthy()
  expect(screen.queryByText('˅')).toBeNull()
})

test('the title is underlined by a spire divider, not a plain border', () => {
  render(<SectionHeader id="spire" title="Spire" />)
  expect(screen.getByTestId('spire-divider')).toBeTruthy()
  expect(JSON.stringify(screen.toJSON())).not.toContain('border-b')
})
