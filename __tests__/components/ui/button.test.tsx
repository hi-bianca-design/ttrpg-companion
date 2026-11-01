import { fireEvent, render, screen } from '@testing-library/react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

test('highlight variant', () => {
  render(
    <Button variant="highlight" testID="btn">
      <Text>Go</Text>
    </Button>,
  )
  const cls = screen.getByTestId('btn').props.className
  expect(cls).toContain('bg-highlight')
  expect(cls).toContain('rounded-full')
})

test('default size is h-11 and sm is h-8', () => {
  render(
    <>
      <Button testID="a"><Text>A</Text></Button>
      <Button size="sm" testID="b"><Text>B</Text></Button>
    </>,
  )
  expect(screen.getByTestId('a').props.className).toContain('h-11')
  expect(screen.getByTestId('b').props.className).toContain('h-8')
})

test('fires onPress when enabled', () => {
  const onPress = jest.fn()
  render(<Button onPress={onPress}><Text>Go</Text></Button>)
  fireEvent.press(screen.getByText('Go'))
  expect(onPress).toHaveBeenCalledTimes(1)
})

test('disabled button does not fire onPress', () => {
  const onPress = jest.fn()
  render(<Button disabled onPress={onPress}><Text>Go</Text></Button>)
  fireEvent.press(screen.getByText('Go'))
  expect(onPress).not.toHaveBeenCalled()
})
