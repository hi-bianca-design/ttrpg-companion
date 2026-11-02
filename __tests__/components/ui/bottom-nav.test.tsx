import { fireEvent, render, screen } from '@testing-library/react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { BottomNav } from '@/components/ui/bottom-nav'

function props(index = 0) {
  const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() }
  const routes = [
    { key: 'a', name: 'index', params: undefined },
    { key: 'b', name: 'characters', params: undefined },
    { key: 'c', name: 'campaigns', params: undefined },
  ]
  const descriptors = {
    a: { options: { title: 'Index', tabBarItemStyle: { display: 'none' } } },
    b: { options: { title: 'Characters', tabBarIcon: () => <Text>icon-b</Text> } },
    c: { options: { title: 'Campaigns', tabBarIcon: () => <Text>icon-c</Text> } },
  }
  return { navigation, p: { state: { index, routes }, descriptors, navigation, insets: { top: 0, bottom: 34, left: 0, right: 0 } } as unknown as BottomTabBarProps }
}

test('hidden (href null) screens get no tab', () => {
  render(<BottomNav {...props(1).p} />)
  expect(screen.queryByRole('tab', { name: 'Index' })).toBeNull()
  expect(screen.getAllByRole('tab')).toHaveLength(2)
})

test('the active tab is selected and only its icon gets the pill', () => {
  render(<BottomNav {...props(1).p} />)
  expect(screen.getByRole('tab', { name: 'Characters' }).props.accessibilityState).toEqual({ selected: true })
  expect(screen.getByRole('tab', { name: 'Campaigns' }).props.accessibilityState).toEqual({ selected: false })
  expect(screen.getAllByTestId('nav-pill')).toHaveLength(1)
})

test('labels are plain caption text on a simple bordered bar, so they never truncate inside a plate', () => {
  render(<BottomNav {...props(1).p} />)
  expect(screen.getByTestId('bottom-nav').props.className).toContain('border-t')
  expect(screen.getByText('Characters').props.className).not.toContain('uppercase')
})

test('pressing another tab emits tabPress then navigates; pressing the active tab does not', () => {
  const { navigation, p } = props(1)
  render(<BottomNav {...p} />)
  fireEvent.press(screen.getByRole('tab', { name: 'Characters' }))
  expect(navigation.navigate).not.toHaveBeenCalled()
  fireEvent.press(screen.getByRole('tab', { name: 'Campaigns' }))
  expect(navigation.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'tabPress', target: 'c' }))
  expect(navigation.navigate).toHaveBeenCalledWith('campaigns', undefined)
})

test('an extra item is a button that runs its action and never takes the active pill', () => {
  const onPress = jest.fn()
  const { p } = props(1)
  render(<BottomNav {...p} extra={{ label: 'Account', icon: () => <Text>user</Text>, onPress }} />)
  fireEvent.press(screen.getByRole('button', { name: 'Account' }))
  expect(onPress).toHaveBeenCalledTimes(1)
  expect(screen.getAllByTestId('nav-pill')).toHaveLength(1)
})
