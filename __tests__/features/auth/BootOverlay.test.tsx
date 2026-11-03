import { act, render, screen } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'
import { RISE_MS } from '@/components/game/LoadingScreen'
import { BootOverlay } from '@/features/auth/BootOverlay'
import { useAuth } from '@/features/auth/useAuth'

jest.mock('@/features/auth/useAuth', () => ({ useAuth: jest.fn() }))
const mockUseAuth = useAuth as jest.Mock

// Flushes the Reduce Motion lookup first, then moves time in frame-sized steps so Animated.timing completes.
const settle = async (ms = 0) => {
  await act(async () => { await Promise.resolve() })
  for (let t = 0; t < ms; t += 16) await act(async () => { jest.advanceTimersByTime(16) })
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

test('shows the loading scene while the session check is running, even after the moon has risen', async () => {
  mockUseAuth.mockReturnValue({ loading: true })
  render(<BootOverlay />)
  await settle(RISE_MS + 2000)
  expect(screen.getByTestId('boot-overlay').props.pointerEvents).toBe('auto')
  expect(screen.getByTestId('moon-hero')).toBeTruthy()
})

test('keeps the scene up until the moon has had time to rise, then hands the screen over', async () => {
  mockUseAuth.mockReturnValue({ loading: false })
  render(<BootOverlay />)
  await settle(RISE_MS - 100)
  expect(screen.getByTestId('boot-overlay').props.pointerEvents).toBe('auto')
  await settle(1000)
  expect(screen.queryByTestId('boot-overlay')).toBeNull()
})

test('with Reduce Motion on, leaves as soon as the session check is done', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
  mockUseAuth.mockReturnValue({ loading: false })
  render(<BootOverlay />)
  await settle(100)
  expect(screen.queryByTestId('boot-overlay')).toBeNull()
})
