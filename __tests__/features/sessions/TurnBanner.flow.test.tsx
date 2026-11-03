import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { TurnBanner } from '@/features/sessions/TurnBanner'
import { endTurn, getActiveSession } from '@/features/sessions/sessions.api'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'

// Real hooks over a mocked API: the sequences a unit test with a mocked mutation can't show.
jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn(), endTurn: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCharacterCampaign: () => ({ data: { id: 'camp1' } }) }))
jest.mock('@/features/characters/characters.queries', () => ({ useCharacter: () => ({ data: { id: 'ch1', owner_id: 'p1' } }) }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'p1' } }) }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}), useGlobalSearchParams: () => ({ id: 'ch1' }) }))

const holding = { id: 's1', campaign_id: 'camp1', status: 'active', in_combat: true, current_turn_user_id: 'p1' }

function renderBanner() {
  const client = makeTestQueryClient()
  // The app's client keeps data fresh for 30s; with the test client's 0 mounting would refetch.
  client.setQueryDefaults(['session'], { staleTime: 60_000 })
  render(<QueryClientProvider client={client}><TurnBanner /></QueryClientProvider>)
  return client
}

beforeEach(() => jest.clearAllMocks())

test('ending the turn removes the banner with no toast', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValue(holding)
  ;(endTurn as jest.Mock).mockResolvedValue({ ...holding, current_turn_user_id: null })
  renderBanner()
  fireEvent.press(await screen.findByRole('button', { name: 'End Turn' }))
  await waitFor(() => expect(screen.queryByText('Your turn')).toBeNull())
  expect(showToast).not.toHaveBeenCalled()
})

test('ending a turn the GM already moved toasts and the banner goes away', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValueOnce(holding).mockResolvedValue({ ...holding, current_turn_user_id: 'p2' })
  ;(endTurn as jest.Mock).mockRejectedValue(new AppError('not_your_turn'))
  renderBanner()
  fireEvent.press(await screen.findByRole('button', { name: 'End Turn' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.not_your_turn))
  await waitFor(() => expect(screen.queryByText('Your turn')).toBeNull())
})

test('the toast still shows when a poll ends the session while the call is in flight', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValueOnce(holding).mockResolvedValue(null)
  let rejectCall!: (e: unknown) => void
  ;(endTurn as jest.Mock).mockImplementation(() => new Promise((_resolve, reject) => { rejectCall = reject }))
  const client = renderBanner()
  fireEvent.press(await screen.findByRole('button', { name: 'End Turn' }))
  await act(async () => { await client.invalidateQueries({ queryKey: qk.session('camp1') }) })
  await waitFor(() => expect(screen.queryByText('Your turn')).toBeNull())
  await act(async () => { rejectCall(new AppError('no_active_session')) })
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.no_active_session))
})
