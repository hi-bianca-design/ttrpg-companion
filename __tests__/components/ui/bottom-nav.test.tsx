import { fireEvent, render, screen } from '@testing-library/react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { StyleSheet, Text } from 'react-native'
import { Path } from 'react-native-svg'
import { BottomNav } from '@/components/ui/bottom-nav'
import { NAV_BAR_GAP } from '@/components/ui/nav-inset'

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

test('the active tab is selected and only it is drawn as the active plate', () => {
  render(<BottomNav {...props(1).p} />)
  expect(screen.getByRole('tab', { name: 'Characters' }).props.accessibilityState).toEqual({ selected: true })
  expect(screen.getByRole('tab', { name: 'Campaigns' }).props.accessibilityState).toEqual({ selected: false })
  expect(screen.getAllByTestId('nav-active')).toHaveLength(1)
})

test('the bar floats: absolutely positioned above the safe area, no pill anywhere', () => {
  const { toJSON } = render(<BottomNav {...props(1).p} />)
  const style = StyleSheet.flatten(screen.getByTestId('bottom-nav').props.style)
  expect(style).toEqual(expect.objectContaining({ position: 'absolute', left: 12, right: 12, bottom: NAV_BAR_GAP + 34 }))
  expect(JSON.stringify(toJSON())).not.toContain('rounded-full')
})

test('the plate keeps 8px above and below the active tablet, and casts a hard shadow so it floats', () => {
  render(<BottomNav {...props(1).p} />)
  expect(screen.getByTestId('bottom-nav-plate').props.className).toContain('py-2')
  expect(screen.getByTestId('bottom-nav-plate').props.className).toContain('px-4')
  const shadow = screen.UNSAFE_getAllByType(Path).filter((p) => p.props.transform === 'translate(4 4)')
  expect(shadow.length).toBeGreaterThan(0)
})

test('every item is at least 44pt tall and its label stays on one line', () => {
  render(<BottomNav {...props(1).p} />)
  for (const tab of screen.getAllByRole('tab')) expect(tab.props.className).toContain('min-h-11')
  expect(screen.getByText('Characters').props.numberOfLines).toBe(1)
})

test('a leading item renders before the tabs as a button that never takes the active plate', () => {
  const onPress = jest.fn()
  render(<BottomNav {...props(1).p} leading={{ label: 'Home', icon: () => <Text>house</Text>, onPress }} />)
  const labels = screen.getAllByText(/^(Home|Characters|Campaigns)$/).map((n) => n.props.children)
  expect(labels).toEqual(['Home', 'Characters', 'Campaigns'])
  fireEvent.press(screen.getByRole('button', { name: 'Home' }))
  expect(onPress).toHaveBeenCalledTimes(1)
  expect(screen.getAllByTestId('nav-active')).toHaveLength(1)
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
