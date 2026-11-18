import { onlineManager } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react-native'
import { OfflineBadge } from '@/features/combat/OfflineBadge'

afterEach(() => act(() => onlineManager.setOnline(true)))

test('shows nothing while online and the quiet marker while offline', () => {
  render(<OfflineBadge />)
  expect(screen.queryByText('Offline: changes will sync')).toBeNull()
  act(() => onlineManager.setOnline(false))
  expect(screen.getByText('Offline: changes will sync')).toBeTruthy()
  act(() => onlineManager.setOnline(true))
  expect(screen.queryByText('Offline: changes will sync')).toBeNull()
})
