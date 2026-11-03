import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { TurnBanner } from '@/features/sessions/TurnBanner'
import { useCharacterSession } from '@/features/sessions/useCharacterSession'
import { useEndTurn } from '@/features/sessions/sessions.queries'
import { useCharacter } from '@/features/characters/characters.queries'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'

jest.mock('@/features/sessions/useCharacterSession', () => ({ useCharacterSession: jest.fn() }))
jest.mock('@/features/sessions/sessions.queries', () => ({ useEndTurn: jest.fn() }))
jest.mock('@/features/characters/characters.queries', () => ({ useCharacter: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCharacterCampaign: () => ({ data: { id: 'camp1' } }) }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
let mockUserId: string | undefined = 'p1'
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: mockUserId ? { id: mockUserId } : null }) }))
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}), useGlobalSearchParams: () => ({ id: 'ch1' }) }))

const holding = { id: 's1', campaign_id: 'camp1', in_combat: true, current_turn_user_id: 'p1' }
const mutateAsync = jest.fn()

function setup(session: object | null, user: string | null = 'p1', owner = 'p1') {
  mockUserId = user ?? undefined
  ;(useCharacterSession as jest.Mock).mockReturnValue(session)
  ;(useCharacter as jest.Mock).mockReturnValue({ data: { id: 'ch1', owner_id: owner } })
  ;(useEndTurn as jest.Mock).mockReturnValue({ mutateAsync })
  return render(<TurnBanner />)
}

beforeEach(() => {
  jest.clearAllMocks()
  mutateAsync.mockResolvedValue({})
})

test('the holder sees the banner with the agreed copy and an End Turn button', () => {
  setup(holding)
  expect(screen.getByText('Your turn')).toBeTruthy()
  expect(screen.getByText('Take your action, bonus action, and movement')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'End Turn' })).toBeTruthy()
})

test.each([
  ['no session', null, 'p1', 'p1'],
  ['someone else holds the turn', { ...holding, current_turn_user_id: 'p2' }, 'p1', 'p1'],
  ['out of combat', { ...holding, in_combat: false }, 'p1', 'p1'],
  ['the holder is viewing a teammate’s sheet', holding, 'p1', 'p2'],
  ['the GM is viewing the holder’s sheet', holding, 'gm1', 'p1'],
  ['no signed-in user', holding, null, 'p1'],
])('no banner when %s', (_why, session, user, owner) => {
  setup(session, user, owner)
  expect(screen.queryByText('Your turn')).toBeNull()
})

test('End Turn ends the turn by session id', () => {
  setup(holding)
  fireEvent.press(screen.getByRole('button', { name: 'End Turn' }))
  expect(mutateAsync).toHaveBeenCalledWith('s1')
})

test('a failed End Turn toasts the shared error copy', async () => {
  mutateAsync.mockRejectedValue(new AppError('not_your_turn'))
  setup(holding)
  fireEvent.press(screen.getByRole('button', { name: 'End Turn' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.not_your_turn))
})
