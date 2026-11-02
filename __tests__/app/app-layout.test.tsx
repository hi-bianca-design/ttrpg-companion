import { render } from '@testing-library/react-native'
import { useSegments } from 'expo-router'
import AppLayout from '../../app/(app)/_layout'

const captured: { tabBar?: (props: object) => unknown } = {}

jest.mock('@/features/auth/AccountDrawer', () => ({ AccountDrawer: () => null }))
jest.mock('expo-router', () => {
  const Tabs = (props: { tabBar: (p: object) => unknown }) => {
    captured.tabBar = props.tabBar
    return null
  }
  Tabs.Screen = () => null
  return { Tabs, useSegments: jest.fn() }
})

function tabBarFor(segments: string[]) {
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
