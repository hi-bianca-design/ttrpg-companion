import { render, waitFor } from '@testing-library/react-native'
import { RootRedirect } from '@/features/auth/RootRedirect'
import { setPendingJoinCode, takePendingJoinCode } from '@/features/campaigns/pendingJoin'

const mockReplace = jest.fn()
let mockSegments: string[] = []
let mockParams: Record<string, unknown> = {}
let mockAuth = { user: null as unknown, loading: false }

jest.mock('expo-router', () => ({
  Slot: () => null,
  useRouter: () => ({ replace: mockReplace }),
  useSegments: () => mockSegments,
  useGlobalSearchParams: () => mockParams,
}))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => mockAuth }))
jest.mock('@/features/campaigns/pendingJoin', () => ({ setPendingJoinCode: jest.fn(), takePendingJoinCode: jest.fn() }))

beforeEach(() => {
  jest.clearAllMocks()
  mockSegments = []
  mockParams = {}
  mockAuth = { user: null, loading: false }
  ;(setPendingJoinCode as jest.Mock).mockResolvedValue(undefined)
  ;(takePendingJoinCode as jest.Mock).mockResolvedValue(null)
})

test('signed out on the join screen stashes the code, then goes to login', async () => {
  mockSegments = ['(app)', 'campaigns', 'join']
  mockParams = { code: 'ab12cd' }
  render(<RootRedirect />)
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'))
  expect(setPendingJoinCode).toHaveBeenCalledWith('AB12CD')
})

test('signed out elsewhere does not stash a code', async () => {
  mockSegments = ['(app)', 'characters']
  mockParams = { code: 'AB12CD' }
  render(<RootRedirect />)
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'))
  expect(setPendingJoinCode).not.toHaveBeenCalled()
})

test('signed in from the auth screens resumes a pending join', async () => {
  mockAuth = { user: { id: 'u1' }, loading: false }
  mockSegments = ['(auth)', 'login']
  ;(takePendingJoinCode as jest.Mock).mockResolvedValue('AB12CD')
  render(<RootRedirect />)
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/(app)/campaigns/join', params: { code: 'AB12CD' } }),
  )
})

test('signed in with nothing pending goes home', async () => {
  mockAuth = { user: { id: 'u1' }, loading: false }
  mockSegments = ['(auth)', 'signup']
  render(<RootRedirect />)
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'))
})

test('does nothing while loading', () => {
  mockAuth = { user: null, loading: true }
  render(<RootRedirect />)
  expect(mockReplace).not.toHaveBeenCalled()
  expect(takePendingJoinCode).not.toHaveBeenCalled()
})
