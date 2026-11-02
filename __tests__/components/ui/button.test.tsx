import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { Button } from '@/components/ui/button'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { Text } from '@/components/ui/text'

const surface = () => screen.UNSAFE_getByType(ShapedSurface).props

test.each([
  ['primary', 'primary', 'text-primary-foreground'],
  ['secondary', 'secondary', 'text-secondary-foreground'],
  ['destructive', 'bloodFill', 'text-destructive-foreground'],
] as const)('%s variant is a flat %s fill with matching label colour', (variant, fill, textClass) => {
  render(
    <Button variant={variant} testID="btn">
      <Text>Go</Text>
    </Button>,
  )
  expect(surface().fill).toBe(fill)
  expect(screen.getByText('Go').props.className).toContain(textClass)
})

test('destructive carries a blood outline', () => {
  render(<Button variant="destructive"><Text>Abandon</Text></Button>)
  expect(surface().stroke).toBe('blood')
})

test('outline variant is a dark pointed plate with a mint stroke and accent text', () => {
  render(
    <Button variant="outline" testID="o">
      <Text>Bonus</Text>
    </Button>,
  )
  expect(surface().fill).toBe('rockDeep')
  expect(surface().stroke).toBe('secondary')
  expect(screen.getByText('Bonus').props.className).toContain('text-accent-foreground')
})

test('ghost has no shaped surface', () => {
  render(<Button variant="ghost"><Text>Skip</Text></Button>)
  expect(screen.UNSAFE_queryByType(ShapedSurface)).toBeNull()
})

test('labels are letter-spaced uppercase Cinzel', () => {
  render(<Button><Text>Begin</Text></Button>)
  const cls = screen.getByText('Begin').props.className
  expect(cls).toContain('font-display-medium')
  expect(cls).toContain('uppercase')
  expect(cls).toContain('tracking-widest')
})

test('default size is h-11 and sm is h-8 with a 44pt hit area; no pill radius', () => {
  render(
    <>
      <Button testID="a"><Text>A</Text></Button>
      <Button size="sm" testID="b"><Text>B</Text></Button>
    </>,
  )
  expect(screen.getByTestId('a').props.className).toContain('h-11')
  expect(screen.getByTestId('b').props.className).toContain('h-8')
  expect(screen.getByTestId('a').props.className).not.toContain('rounded-full')
  expect(screen.getByTestId('b').props.hitSlop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 })
  expect(screen.getByTestId('a').props.hitSlop).toBeUndefined()
})

test('icon buttons are square chamfered plates', () => {
  render(<Button size="icon" testID="i"><Text>+</Text></Button>)
  expect(screen.getByTestId('i').props.className).toContain('w-8')
  expect(surface().shape).toBe('chamfer')
})

test('pressing sinks the button into its shadow, releasing restores it', () => {
  render(<Button testID="btn"><Text>Go</Text></Button>)
  expect(surface().shadowOffset).toBe(3)
  fireEvent(screen.getByTestId('btn'), 'pressIn')
  expect(surface().shadowOffset).toBe(1)
  expect(StyleSheet.flatten(screen.getByTestId('btn').props.style).transform).toEqual([{ translateX: 2 }, { translateY: 2 }])
  fireEvent(screen.getByTestId('btn'), 'pressOut')
  expect(surface().shadowOffset).toBe(3)
})

test('lit adds the torch glow', () => {
  render(<Button lit><Text>Go</Text></Button>)
  expect(surface().glow).toBe('torch')
})

test('disabled is dimmed, never glows or sinks, and does not fire onPress', () => {
  const onPress = jest.fn()
  render(<Button disabled lit onPress={onPress} testID="btn"><Text>Go</Text></Button>)
  expect(screen.getByTestId('btn').props.className).toContain('opacity-50')
  expect(surface().glow).toBeUndefined()
  fireEvent(screen.getByTestId('btn'), 'pressIn')
  expect(surface().shadowOffset).toBe(3)
  fireEvent.press(screen.getByText('Go'))
  expect(onPress).not.toHaveBeenCalled()
})

test('fires onPress when enabled', () => {
  const onPress = jest.fn()
  render(<Button onPress={onPress}><Text>Go</Text></Button>)
  fireEvent.press(screen.getByText('Go'))
  expect(onPress).toHaveBeenCalledTimes(1)
})

test('still calls a caller-supplied onPressIn/onPressOut', () => {
  const onPressIn = jest.fn()
  const onPressOut = jest.fn()
  render(<Button onPressIn={onPressIn} onPressOut={onPressOut} testID="btn"><Text>Go</Text></Button>)
  fireEvent(screen.getByTestId('btn'), 'pressIn')
  fireEvent(screen.getByTestId('btn'), 'pressOut')
  expect(onPressIn).toHaveBeenCalledTimes(1)
  expect(onPressOut).toHaveBeenCalledTimes(1)
})

test('stroke recolours the plate edge (tinted +/- controls)', () => {
  render(<Button variant="outline" stroke="resourceSage"><Text>+</Text></Button>)
  expect(surface().stroke).toBe('resourceSage')
})

test('a ghost text button reads as a link: mint and underlined', () => {
  render(<Button variant="ghost"><Text>No account yet? Create one</Text></Button>)
  const cls = screen.getByText('No account yet? Create one').props.className
  expect(cls).toContain('underline')
  expect(cls).toContain('text-accent-foreground')
})
