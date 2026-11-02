import { render, screen } from '@testing-library/react-native'
import { SessionBadge } from '@/features/sessions/SessionBadge'
import { useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useActiveSession } from '@/features/sessions/sessions.queries'

jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCharacterCampaign: jest.fn() }))
jest.mock('@/features/sessions/sessions.queries', () => ({ useActiveSession: jest.fn() }))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({ id: 'ch1' }),
}))

const inCampaign = { data: { id: 'camp1', name: 'Odd Game' }, isLoading: false, isError: false }

beforeEach(() => {
  jest.clearAllMocks()
  ;(useCharacterCampaign as jest.Mock).mockReturnValue(inCampaign)
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: null, isError: false })
})

test('shows Session: Active when the character’s campaign has an active session', () => {
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: { id: 's1' }, isError: false })
  render(<SessionBadge />)
  expect(screen.getByText('Session: Active')).toBeTruthy()
  expect(useActiveSession).toHaveBeenCalledWith('camp1')
})

test('renders nothing when there is no active session', () => {
  render(<SessionBadge />)
  expect(screen.toJSON()).toBeNull()
})

test('renders nothing, and asks for no session, when the character is in no campaign', () => {
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: null, isLoading: false, isError: false })
  render(<SessionBadge />)
  expect(screen.toJSON()).toBeNull()
  expect(useActiveSession).toHaveBeenCalledWith(undefined)
})

test('renders nothing while the campaign is loading', () => {
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, isError: false })
  render(<SessionBadge />)
  expect(screen.toJSON()).toBeNull()
  expect(useActiveSession).toHaveBeenCalledWith(undefined)
})

test('renders nothing, and no error text, when the session query fails', () => {
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: undefined, isError: true })
  render(<SessionBadge />)
  expect(screen.toJSON()).toBeNull()
})
