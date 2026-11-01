import { act, render, screen } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { showToast, Toaster, TOAST_MS } from '@/components/ui/toast'

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }

beforeEach(() => jest.useFakeTimers())
afterEach(() => {
  act(() => { jest.runOnlyPendingTimers() })
  jest.useRealTimers()
})

function renderToaster() {
  return render(<SafeAreaProvider initialMetrics={METRICS}><Toaster /></SafeAreaProvider>)
}

test('showToast shows the message as a polite status, then it fades away', () => {
  renderToaster()
  expect(screen.queryByRole('alert')).toBeNull()
  act(() => showToast('Long rest: Hit Points 14/14 restored.'))
  const toast = screen.getByText('Long rest: Hit Points 14/14 restored.')
  expect(toast).toBeTruthy()
  expect(screen.getByLabelText('Long rest: Hit Points 14/14 restored.').props.accessibilityLiveRegion).toBe('polite')
  act(() => { jest.advanceTimersByTime(TOAST_MS + 500) })
  expect(screen.queryByText('Long rest: Hit Points 14/14 restored.')).toBeNull()
})

test('a second toast replaces the first and restarts the timer', () => {
  renderToaster()
  act(() => showToast('First'))
  act(() => { jest.advanceTimersByTime(TOAST_MS - 200) })
  act(() => showToast('Second'))
  expect(screen.queryByText('First')).toBeNull()
  act(() => { jest.advanceTimersByTime(400) })
  expect(screen.getByText('Second')).toBeTruthy()
})

test('the toast uses the inverse ink surface (readable over any screen)', () => {
  renderToaster()
  act(() => showToast('Saved'))
  expect(screen.getByText('Saved').props.className).toContain('text-background')
})

test('sits above the tab bar: bottom = inset + tab bar height + 8; style holds only opacity and bottom', () => {
  const { TAB_BAR_CONTENT_HEIGHT } = jest.requireActual('@/lib/theme')
  renderToaster()
  act(() => showToast('Placed'))
  const positioned = screen.UNSAFE_root.findAll((n: { props: { style?: unknown } }) => {
    const st = n.props.style as Record<string, unknown> | undefined
    return !!st && typeof st === 'object' && !Array.isArray(st) && 'bottom' in st
  })
  expect(positioned.length).toBeGreaterThan(0)
  const style = positioned[0].props.style as Record<string, unknown>
  expect(style.bottom).toBe(34 + TAB_BAR_CONTENT_HEIGHT + 8)
  expect(Object.keys(style).filter((k) => k !== 'bottom' && k !== 'opacity')).toEqual([])
})

test('ToastClearance: with the screen column gap and bottom padding it leaves TOAST_CLEARANCE under the last control', () => {
  const { ToastClearance, TOAST_CLEARANCE, SCREEN_COLUMN_GAP, SCREEN_BOTTOM_PADDING, TOAST_BAND } = jest.requireActual('@/components/ui/toast')
  render(<ToastClearance />)
  const spacer = screen.getByTestId('toast-clearance')
  expect(spacer.props.style.height + SCREEN_COLUMN_GAP + SCREEN_BOTTOM_PADDING).toBe(TOAST_CLEARANCE)
  // A one-line toast band (8pt gap + the pill) fits inside the clearance with room to spare.
  expect(TOAST_CLEARANCE).toBeGreaterThan(TOAST_BAND)
})

test('toast text wraps to at most two lines, and the band is sized for two', () => {
  const { TOAST_BAND, TOAST_CLEARANCE } = jest.requireActual('@/components/ui/toast')
  renderToaster()
  act(() => showToast('Long rest: Hit Points 14/14, Spell Slots, Hit Dice and everything else restored.'))
  expect(screen.getByText(/Long rest/).props.numberOfLines).toBe(2)
  // 8pt gap + py-3 (24) + two body-sm lines (2 × 20)
  expect(TOAST_BAND).toBe(8 + 24 + 40)
  expect(TOAST_CLEARANCE).toBeGreaterThanOrEqual(TOAST_BAND + 16)
})
