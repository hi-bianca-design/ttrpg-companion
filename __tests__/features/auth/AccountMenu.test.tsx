import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { AccountMenu } from '@/features/auth/AccountMenu'
import { signOut } from '@/features/auth/auth.api'
import { ERROR_COPY } from '@/features/errors'

jest.mock('@/features/auth/auth.api', () => ({ signOut: jest.fn() }))
jest.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'mira@example.com', user_metadata: { username: 'mira' } } }),
}))

beforeEach(() => jest.clearAllMocks())

function renderMenu() {
  return render(<><AccountMenu /><PortalHost /></>)
}

function openSignOutDialog() {
  fireEvent.press(screen.getByRole('button', { name: 'Account' }))
  fireEvent.press(screen.getByRole('button', { name: 'Sign out' }))
}

test('the header button is a ghost icon button with a 44pt hit area', () => {
  renderMenu()
  const button = screen.getByRole('button', { name: 'Account' })
  expect(button.props.className).toContain('bg-transparent')
  expect(button.props.hitSlop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 })
})

test('the account sheet shows the username and email and an outline Sign out', () => {
  renderMenu()
  fireEvent.press(screen.getByRole('button', { name: 'Account' }))
  expect(screen.getByText('mira')).toBeTruthy()
  expect(screen.getByText('mira@example.com')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Sign out' }).props.className).toContain('border-primary')
})

test('Sign out asks for confirmation before signing out', () => {
  renderMenu()
  openSignOutDialog()
  expect(screen.getByText('Sign out of D&D Companion?')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Stay signed in' }).props.className).toContain('border-primary')
  expect(signOut).not.toHaveBeenCalled()
})

test('Stay signed in closes the dialog without signing out', () => {
  renderMenu()
  openSignOutDialog()
  fireEvent.press(screen.getByRole('button', { name: 'Stay signed in' }))
  expect(screen.queryByText('Sign out of D&D Companion?')).toBeNull()
  expect(signOut).not.toHaveBeenCalled()
})

test('confirming signs out (AuthProvider then routes to login and clears the cache)', async () => {
  ;(signOut as jest.Mock).mockResolvedValue(undefined)
  renderMenu()
  openSignOutDialog()
  const confirm = screen.getByRole('button', { name: 'Sign out' })
  expect(confirm.props.className).toContain('bg-primary')
  fireEvent.press(confirm)
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
})

test('a failed sign-out shows the shared error copy and keeps the dialog open', async () => {
  ;(signOut as jest.Mock).mockRejectedValue(new Error('Failed to fetch'))
  renderMenu()
  openSignOutDialog()
  fireEvent.press(screen.getByRole('button', { name: 'Sign out' }))
  expect(await screen.findByText(ERROR_COPY.network)).toBeTruthy()
  expect(screen.getByText('Sign out of D&D Companion?')).toBeTruthy()
})
