import '@testing-library/jest-native/extend-expect'
import { AccessibilityInfo } from 'react-native'
import { render, screen } from '@testing-library/react-native'
import { CombatStarting } from '@/features/combat/CombatStarting'

test('shows Combat is starting and no number fields', () => {
  render(<CombatStarting />)
  expect(screen.getByText('Combat is starting')).toBeTruthy()
  expect(screen.queryByLabelText(/Initiative/)).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()
  screen.unmount()
})

test('is announced once when it appears', () => {
  const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  spy.mockClear() // RN's jest setup already mocks this, so earlier tests' calls would otherwise count
  render(<CombatStarting />)
  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy).toHaveBeenCalledWith('Combat is starting')
})
