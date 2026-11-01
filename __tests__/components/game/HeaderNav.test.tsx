import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { BackButton, CancelButton, NavRow } from '@/components/game/HeaderNav'

test('BackButton is a ghost caret icon button labelled Back with a 44pt hit area', () => {
  const onPress = jest.fn()
  render(<BackButton onPress={onPress} />)
  const back = screen.getByRole('button', { name: 'Back' })
  expect(back.props.className).toContain('bg-transparent')
  expect(back.props.className).toContain('h-8 w-8')
  expect(back.props.className).not.toContain('border-primary')
  expect(back.props.hitSlop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 })
  expect(screen.queryByText('Back')).toBeNull()
  fireEvent.press(back)
  expect(onPress).toHaveBeenCalledTimes(1)
})

test('CancelButton is a ghost text button, not an outline pill', () => {
  const onPress = jest.fn()
  render(<CancelButton onPress={onPress} />)
  const cancel = screen.getByRole('button', { name: 'Cancel' })
  expect(cancel.props.className).toContain('bg-transparent')
  expect(cancel.props.className).not.toContain('border-primary')
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
