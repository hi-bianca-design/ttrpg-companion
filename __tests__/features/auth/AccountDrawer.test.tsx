import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useState } from 'react'
import { AccountDrawer } from '@/features/auth/AccountDrawer'
import { signOut } from '@/features/auth/auth.api'
import { ERROR_COPY } from '@/features/errors'
import { variantOf } from '../../helpers/button'

jest.mock('@/features/auth/auth.api', () => ({ signOut: jest.fn() }))
const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'mira@example.com', user_metadata: { username: 'mira' } } }),
}))

beforeEach(() => jest.clearAllMocks())

// The Account tab owns the open state; this host stands in for it.
function Host({ initiallyOpen = true }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  return <AccountDrawer open={open} onOpenChange={setOpen} />
}

function renderMenu() {
  return render(<><Host /><PortalHost /></>)
}

function openSignOutDialog() {
  fireEvent.press(screen.getByRole('button', { name: 'Sign out' }))
}

test('the drawer shows an initial badge, the username and email, and an outline Sign out', () => {
  renderMenu()
  expect(screen.getByText('M')).toBeTruthy()
  expect(screen.getByText('mira')).toBeTruthy()
  expect(screen.getByText('mira@example.com')).toBeTruthy()
  expect(variantOf(screen.getByRole('button', { name: 'Sign out' }))).toBe('outline')
})

test('Sign out asks for confirmation before signing out', () => {
  renderMenu()
  openSignOutDialog()
  expect(screen.getByText('Sign out of D&D Companion?')).toBeTruthy()
  expect(variantOf(screen.getByRole('button', { name: 'Stay signed in' }))).toBe('outline')
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
  expect(variantOf(confirm)).toBe('primary')
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

test('the drawer closes from a ghost X icon in its header, not a text button under Sign out', () => {
  renderMenu()
  const close = screen.getByRole('button', { name: 'Close' })
  expect(variantOf(close)).toBe('ghost')
  expect(screen.queryByText('Close')).toBeNull()
  fireEvent.press(close)
  expect(screen.queryByText('mira@example.com')).toBeNull()
  expect(signOut).not.toHaveBeenCalled()
})

test('the drawer is one layout box (its sheet and dialog roots must not become extra row children that take a gap)', () => {
  const { toJSON } = render(<Host initiallyOpen={false} />)
  const tree = toJSON()
  expect(Array.isArray(tree)).toBe(false)
})

test('the drawer links to the packs shop and closes', () => {
  renderMenu()
  fireEvent.press(screen.getByRole('button', { name: 'Packs' }))
  expect(mockPush).toHaveBeenCalledWith('/(app)/shop')
  expect(screen.queryByRole('button', { name: 'Packs' })).toBeNull()
})
