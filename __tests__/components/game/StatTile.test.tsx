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
  fireEvent.press(screen.getByRole('button', { name: 'AC 15' }))
  expect(onPress).toHaveBeenCalledTimes(1)
})

test('highlight tone colours the number, not the tile border', () => {
  render(<StatTile label="HP" value={38} tone="highlight" />)
  expect(screen.getByText('38').props.className).toContain('text-highlight-text')
  expect(JSON.stringify(screen.toJSON())).not.toContain('border-highlight')
})

test('accessible label includes the value and sub; pressable tiles carry a hint', () => {
  render(<StatTile label="HP" value={10} sub="/20 +5" accessibilityHint="Adjust hit points" onPress={jest.fn()} />)
  const tile = screen.getByRole('button', { name: 'HP 10/20 +5' })
  expect(tile.props.accessibilityHint).toBe('Adjust hit points')
})

test('a static tile is one accessible element with its value', () => {
  render(<StatTile label="AC" value={16} />)
  expect(screen.getByLabelText('AC 16')).toBeTruthy()
})

test('destructive tone: destructive border and number', () => {
  render(<StatTile label="HP" value={0} tone="destructive" />)
  expect(screen.getByText('0').props.className).toContain('text-destructive')
  expect(JSON.stringify(screen.toJSON())).toContain('border-destructive')
})
