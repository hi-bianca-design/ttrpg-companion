import { render, renderHook, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import type { ReactNode } from 'react'
import { ScreenBackground } from '@/components/game/ScreenBackground'
import { NAV_BAR_GAP, NAV_BAR_HEIGHT, NavInsetContext, useNavInset } from '@/components/ui/nav-inset'
import { TAB_BAR_CONTENT_HEIGHT } from '@/lib/theme'

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 34 } }

function wrap(bar?: boolean) {
  return ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={metrics}>
      {bar === undefined ? children : <NavInsetContext.Provider value={bar}>{children}</NavInsetContext.Provider>}
    </SafeAreaProvider>
  )
}

test('no bar means no inset, with or without a provider', () => {
  expect(renderHook(() => useNavInset(), { wrapper: wrap() }).result.current).toBe(0)
  expect(renderHook(() => useNavInset(), { wrapper: wrap(false) }).result.current).toBe(0)
})

test('a visible bar reserves its height, the gap and the bottom safe area', () => {
  expect(renderHook(() => useNavInset(), { wrapper: wrap(true) }).result.current).toBe(NAV_BAR_HEIGHT + NAV_BAR_GAP + 34)
})

test('the toast offset constant is the bar plus its gap', () => {
  expect(TAB_BAR_CONTENT_HEIGHT).toBe(NAV_BAR_HEIGHT + NAV_BAR_GAP)
})

test('scrolling screens get bottom space under a bar and keep pb-8 without one', () => {
  const W = wrap(true)
  render(<W><ScreenBackground scroll><Text>One</Text></ScreenBackground></W>)
  expect(screen.getByTestId('screen-content').props.style).toEqual(expect.objectContaining({ paddingBottom: 32 + NAV_BAR_HEIGHT + NAV_BAR_GAP + 34 }))
  screen.unmount()
  const N = wrap()
  render(<N><ScreenBackground scroll><Text>One</Text></ScreenBackground></N>)
  expect(screen.getByTestId('screen-content').props.className).toContain('pb-8')
})
