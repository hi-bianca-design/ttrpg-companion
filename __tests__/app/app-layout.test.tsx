import { render } from '@testing-library/react-native'
import { useSegments } from 'expo-router'
import AppLayout from '../../app/(app)/_layout'

const captured: { tabBar?: (props: object) => unknown; inset?: boolean; backBehavior?: string; screens: Array<{ name: string; options: Record<string, unknown> }> } = { screens: [] }

jest.mock('@/features/auth/AccountDrawer', () => ({ AccountDrawer: () => null }))
jest.mock('expo-router', () => {
  const { useContext } = jest.requireActual('react')
  const { NavInsetContext } = jest.requireActual('@/components/ui/nav-inset')
  const Tabs = (props: { tabBar: (p: object) => unknown; backBehavior?: string; children?: unknown }) => {
    captured.tabBar = props.tabBar
    captured.backBehavior = props.backBehavior
    captured.inset = useContext(NavInsetContext)
    return props.children ?? null
  }
  Tabs.Screen = (props: { name: string; options: Record<string, unknown> }) => {
    captured.screens.push(props)
    return null
  }
  return { Tabs, useSegments: jest.fn() }
})

function tabBarFor(segments: string[]) {
  captured.screens = []
  ;(useSegments as jest.Mock).mockReturnValue(segments)
  render(<AppLayout />)
  return captured.tabBar?.({})
}

test('the root tab bar shows on the characters list', () => {
  expect(tabBarFor(['(app)', 'characters'])).not.toBeNull()
})

test('the root tab bar is hidden in the character wizard, on every step', () => {
  expect(tabBarFor(['(app)', 'characters', 'new'])).toBeNull()
  expect(tabBarFor(['(app)', 'characters', 'new', '[step]'])).toBeNull()
})

test('the root tab bar stays hidden in the character sheet', () => {
  expect(tabBarFor(['(app)', 'characters', '[id]'])).toBeNull()
})

test('other tabs keep the root tab bar on their pushed and modal-like screens', () => {
  for (const segs of [
    ['(app)', 'campaigns', 'new'],
    ['(app)', 'campaigns', 'join'],
    ['(app)', 'campaigns', '[id]'],
    ['(app)', 'content', 'new'],
    ['(app)', 'content', '[id]'],
  ]) {
    expect(tabBarFor(segs)).not.toBeNull()
  }
})

test('Home is the first root tab: visible, titled Home, and the back target of the other tabs', () => {
  tabBarFor(['(app)'])
  const [first] = captured.screens
  expect(first.name).toBe('index')
  expect(first.options.title).toBe('Home')
  expect(first.options.href).toBeUndefined()
  expect(captured.backBehavior).toBe('initialRoute')
})

test('screens leave room for the bar only where it is shown', () => {
  tabBarFor(['(app)'])
  expect(captured.inset).toBe(true)
  tabBarFor(['(app)', 'campaigns', '[id]'])
  expect(captured.inset).toBe(true)
  tabBarFor(['(app)', 'characters', 'new', '[step]'])
  expect(captured.inset).toBe(false)
  tabBarFor(['(app)', 'characters', '[id]'])
  expect(captured.inset).toBe(false)
})

test('the root bar wrapper covers the screen without taking touches, so the floating bar stays tappable on Android', () => {
  const bar = tabBarFor(['(app)']) as { props: { pointerEvents?: string; style?: unknown } }
  expect(bar.props.pointerEvents).toBe('box-none')
})
