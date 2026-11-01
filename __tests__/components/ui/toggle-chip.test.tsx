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

test('compact size is h-8 with a 6px hitSlop (44pt target), like sm buttons', () => {
  render(<ToggleChip label="Prone" size="sm" onPress={() => {}} testID="c" />)
  const chip = screen.getByTestId('c')
  expect(chip.props.className).toContain('h-8')
  expect(chip.props.className).not.toContain('h-11')
  expect(chip.props.hitSlop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 })
})

test('chips share the outline button stroke weight (border-1.5)', () => {
  render(<ToggleChip label="A" onPress={() => {}} testID="c" />)
  expect(screen.getByTestId('c').props.className).toContain('border-1.5')
})

test('outline tone: selected is a moss outline with accent text, not a filled pill', () => {
  render(
    <>
      <ToggleChip label="Equipped" tone="outline" selected onPress={() => {}} testID="on" />
      <ToggleChip label="Equip" tone="outline" onPress={() => {}} testID="off" />
    </>,
  )
  const on = screen.getByTestId('on')
  expect(on.props.className).toContain('border-primary')
  expect(on.props.className).not.toContain('bg-primary')
  expect(screen.getByText('Equipped').props.className).toContain('text-accent-foreground')
  expect(on.props.accessibilityState).toMatchObject({ selected: true })
  expect(screen.getByTestId('off').props.className).toContain('border-border')
})
