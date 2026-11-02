import { fireEvent, render, screen } from '@testing-library/react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { ToggleChip } from '@/components/ui/toggle-chip'

const surfaces = () => screen.UNSAFE_getAllByType(ShapedSurface).map((n) => n.props)

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
  const [onPlate, offPlate] = surfaces()
  expect(onPlate.fill).toBe('primary')
  expect(onPlate.glow).toBe('torch')
  expect(offPlate.fill).toBe('card')
  expect(offPlate.glow).toBeUndefined()
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

test('compact size is h-8 with a 6px hitSlop (44pt target)', () => {
  render(<ToggleChip label="Prone" size="sm" onPress={() => {}} testID="c" />)
  const chip = screen.getByTestId('c')
  expect(chip.props.className).toContain('h-8')
  expect(chip.props.className).not.toContain('h-11')
  expect(chip.props.hitSlop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 })
})

test('chips are pointed plates with a 1.5px stroke, like the buttons', () => {
  render(<ToggleChip label="A" onPress={() => {}} testID="c" />)
  expect(surfaces()[0].strokeWidth).toBe(1.5)
  expect(screen.getByTestId('c').props.className).not.toContain('rounded-full')
})

test('outline tone: selected is a moss outline with accent text, not a filled pill', () => {
  render(
    <>
      <ToggleChip label="Equipped" tone="outline" selected onPress={() => {}} testID="on" />
      <ToggleChip label="Equip" tone="outline" onPress={() => {}} testID="off" />
    </>,
  )
  const on = screen.getByTestId('on')
  const [onPlate, offPlate] = surfaces()
  expect(onPlate.stroke).toBe('secondary')
  expect(onPlate.fill).toBe('rockDeep')
  expect(screen.getByText('Equipped').props.className).toContain('text-accent-foreground')
  expect(on.props.accessibilityState).toMatchObject({ selected: true })
  expect(offPlate.stroke).toBe('border')
})

test('square size is 44x44 with no side padding so short labels have room', () => {
  render(<ToggleChip label="15" size="square" onPress={() => {}} testID="sq" />)
  expect(screen.getByTestId('sq').props.className).toContain('h-11 w-11')
  const [plate] = surfaces()
  expect(plate.className).toContain('px-0')
  expect(plate.className).not.toContain('px-6')
})
