import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { BackButton, CancelButton, NavRow } from '@/components/game/HeaderNav'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { variantOf } from '../../helpers/button'

test('BackButton is a 44pt faint-edged plate with a heraldic arrow, not a plain caret', () => {
  const onPress = jest.fn()
  render(<BackButton onPress={onPress} />)
  const back = screen.getByRole('button', { name: 'Back' })
  expect(back.props.className).toContain('h-11 w-11')
  expect(screen.getByTestId('back-glyph')).toBeTruthy()
  const plate = screen.UNSAFE_getByType(ShapedSurface).props
  expect(plate.stroke).toBe('border')
  expect(plate.glass).toBeTruthy()
  expect(screen.queryByText('Back')).toBeNull()
  fireEvent.press(back)
  expect(onPress).toHaveBeenCalledTimes(1)
})

test('CancelButton is a ghost text button, not an outline pill', () => {
  const onPress = jest.fn()
  render(<CancelButton onPress={onPress} />)
  const cancel = screen.getByRole('button', { name: 'Cancel' })
  expect(variantOf(cancel)).toBe('ghost')
  expect(variantOf(cancel)).not.toBe('outline')
  expect(screen.getByText('Cancel')).toBeTruthy()
  fireEvent.press(cancel)
  expect(onPress).toHaveBeenCalledTimes(1)
})

test('NavRow is a 44pt row that keeps the leave affordance at the leading edge', () => {
  render(<NavRow testID="nav"><BackButton onPress={jest.fn()} /></NavRow>)
  const row = screen.getByTestId('nav')
  expect(row.props.className).toContain('min-h-11')
  expect(row.props.className).toContain('flex-row')
})

test('CancelButton pulls its 12px padding into the gutter so the text aligns with the 16px margin, keeping the 44pt hit area', () => {
  render(<CancelButton onPress={jest.fn()} />)
  const cancel = screen.getByRole('button', { name: 'Cancel' })
  expect(cancel.props.className).toContain('-ml-3')
  expect(cancel.props.hitSlop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 })
})

test('CancelButton at the trailing edge pulls into the right gutter instead', () => {
  render(<CancelButton edge="trailing" onPress={jest.fn()} />)
  const cancel = screen.getByRole('button', { name: 'Cancel' })
  expect(cancel.props.className).toContain('-mr-3')
  expect(cancel.props.className).not.toContain('-ml-3')
})
