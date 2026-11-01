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
