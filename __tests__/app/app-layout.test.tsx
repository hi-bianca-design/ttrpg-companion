import { render } from '@testing-library/react-native'
import { useSegments } from 'expo-router'
import AppLayout from '../../app/(app)/_layout'

const captured: { screenOptions?: { tabBarStyle?: unknown } } = {}

jest.mock('expo-router', () => {
  const Tabs = (props: { screenOptions: { tabBarStyle?: unknown } }) => {
    captured.screenOptions = props.screenOptions
    return null
  }
  Tabs.Screen = () => null
  return { Tabs, useSegments: jest.fn() }
})
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }))

function tabBarFor(segments: string[]) {
  ;(useSegments as jest.Mock).mockReturnValue(segments)
  render(<AppLayout />)
  return captured.screenOptions?.tabBarStyle
}

test('the root tab bar shows on the characters list', () => {
  expect(tabBarFor(['(app)', 'characters'])).not.toEqual({ display: 'none' })
})

test('the root tab bar is hidden in the character wizard, on every step', () => {
  expect(tabBarFor(['(app)', 'characters', 'new'])).toEqual({ display: 'none' })
  expect(tabBarFor(['(app)', 'characters', 'new', '[step]'])).toEqual({ display: 'none' })
})

test('the root tab bar stays hidden in the character sheet', () => {
  expect(tabBarFor(['(app)', 'characters', '[id]'])).toEqual({ display: 'none' })
})

test('other tabs keep the root tab bar on their pushed and modal-like screens', () => {
  for (const segs of [
    ['(app)', 'campaigns', 'new'],
    ['(app)', 'campaigns', 'join'],
    ['(app)', 'campaigns', '[id]'],
    ['(app)', 'content', 'new'],
    ['(app)', 'content', '[id]'],
  ]) {
    expect(tabBarFor(segs)).not.toEqual({ display: 'none' })
  }
})
