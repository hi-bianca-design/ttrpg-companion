import { fireEvent, render, screen } from '@testing-library/react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { BottomNav } from '@/components/ui/bottom-nav'
import { ShapedSurface } from '@/components/ui/shaped-surface'

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

test('the active tab is selected and is the only lit pill', () => {
  render(<BottomNav {...props(1).p} />)
  expect(screen.getByRole('tab', { name: 'Characters' }).props.accessibilityState).toEqual({ selected: true })
  expect(screen.getByRole('tab', { name: 'Campaigns' }).props.accessibilityState).toEqual({ selected: false })
  const pills = screen.UNSAFE_getAllByType(ShapedSurface).filter((s) => s.props.glow)
  expect(pills).toHaveLength(1)
})

test('the bar is one frosted glass plate', () => {
  render(<BottomNav {...props(1).p} />)
  const bar = screen.UNSAFE_getAllByType(ShapedSurface)[0].props
  expect(bar.glass).toBeTruthy()
  expect(bar.shape).toBe('chamfer')
  expect(bar.shadowOffset).toBe(0)
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
  expect(screen.UNSAFE_getAllByType(ShapedSurface).filter((s) => s.props.glow)).toHaveLength(1)
})
