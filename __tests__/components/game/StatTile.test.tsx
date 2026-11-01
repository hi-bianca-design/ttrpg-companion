import { fireEvent, render, screen } from '@testing-library/react-native'
import { StatTile } from '@/components/game/StatTile'

test('long value fits on one line', () => {
  render(<StatTile label="HP" value="120/120" />)
  const value = screen.getByText('120/120')
  expect(value.props.numberOfLines).toBe(1)
  expect(value.props.adjustsFontSizeToFit).toBe(true)
})

test('onPress fires', () => {
  const onPress = jest.fn()
  render(<StatTile label="AC" value={15} onPress={onPress} />)
  fireEvent.press(screen.getByLabelText('AC'))
  expect(onPress).toHaveBeenCalledTimes(1)
})

test('highlight tone colours the number, not the tile border', () => {
  render(<StatTile label="HP" value={38} tone="highlight" />)
  expect(screen.getByText('38').props.className).toContain('text-highlight-text')
  expect(JSON.stringify(screen.toJSON())).not.toContain('border-highlight')
})
