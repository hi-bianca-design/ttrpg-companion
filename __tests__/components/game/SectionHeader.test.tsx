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

test('the header is one row — title, a faint rule to the trailing edge — with no divider under it', () => {
  render(
    <SectionHeader id="rule" title="Rule">
      <Text>child</Text>
    </SectionHeader>,
  )
  expect(screen.getByTestId('section-rule')).toBeTruthy()
  expect(screen.queryByTestId('spire-divider')).toBeNull()
  expect(JSON.stringify(screen.toJSON())).not.toContain('border-b')
})

test('a collapsible header keeps its chevron at the end of the row, after the rule', () => {
  render(
    <SectionHeader id="rule2" title="Rule two" collapsible>
      <Text>child</Text>
    </SectionHeader>,
  )
  const row = JSON.stringify(screen.toJSON())
  expect(row.indexOf('section-rule')).toBeGreaterThan(-1)
  expect(row.indexOf('section-rule')).toBeLessThan(row.indexOf('icon-chevron'))
})

test('the action sits at the trailing edge of the same row', () => {
  render(<SectionHeader id="rule3" title="Rule three" action={<Text>2/6 assigned</Text>} />)
  const row = JSON.stringify(screen.toJSON())
  expect(row).toContain('section-rule')
  expect(row.indexOf('section-rule')).toBeLessThan(row.indexOf('2/6 assigned'))
})
