import { fireEvent, render, screen } from '@testing-library/react-native'
import { ToggleChip } from '@/components/ui/toggle-chip'

test('fixed 44pt height, selected state styles and a11y', () => {
  render(
    <>
      <ToggleChip label="Fire" selected onPress={() => {}} testID="on" />
      <ToggleChip label="Cold" onPress={() => {}} testID="off" />
    </>,
  )
  const on = screen.getByTestId('on')
  const off = screen.getByTestId('off')
  expect(on.props.className).toContain('h-11')
  expect(off.props.className).toContain('h-11')
  expect(on.props.className).toContain('bg-primary')
  expect(off.props.className).not.toContain('bg-primary')
  expect(on.props.accessibilityState).toMatchObject({ selected: true })
  expect(screen.getByText('Fire').props.className).toContain('text-primary-foreground')
  expect(screen.getByText('Cold').props.className).toContain('text-foreground')
})

test('fires onPress', () => {
  const onPress = jest.fn()
  render(<ToggleChip label="A" onPress={onPress} />)
  fireEvent.press(screen.getByText('A'))
  expect(onPress).toHaveBeenCalledTimes(1)
})

test('disabled chip does not fire onPress', () => {
  const onPress = jest.fn()
  render(<ToggleChip label="B" disabled onPress={onPress} />)
  fireEvent.press(screen.getByText('B'))
  expect(onPress).not.toHaveBeenCalled()
  expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ disabled: true })
})
