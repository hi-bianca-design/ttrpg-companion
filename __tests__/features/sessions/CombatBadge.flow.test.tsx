import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { SessionStatusRow } from '@/features/sessions/SessionStatusRow'
import { getActiveSession, setCombat } from '@/features/sessions/sessions.api'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'

// Real hooks over a mocked API: the sequences a unit test with a mocked mutation can't show.
jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn(), setCombat: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.queries', () => ({
  useCharacterCampaign: () => ({ data: { id: 'camp1' } }),
  useCampaign: () => ({ data: { id: 'camp1', gm_id: 'gm1' } }),
}))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'gm1' } }) }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}), useGlobalSearchParams: () => ({ id: 'ch1' }) }))

const outOfCombat = { id: 's1', campaign_id: 'camp1', status: 'active', in_combat: false, combat_started_by: null }
const inCombat = { ...outOfCombat, in_combat: true, combat_started_by: 'gm1' }

function renderRow() {
  const client = makeTestQueryClient()
  // The app's client keeps data fresh for 30s; with the test client's 0 each badge mounting under the row would refetch.
  client.setQueryDefaults(['session'], { staleTime: 60_000 })
  render(<QueryClientProvider client={client}><SessionStatusRow /><PortalHost /></QueryClientProvider>)
  return client
}

beforeEach(() => jest.clearAllMocks())

test('entering combat shows In combat with no toast', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValue(outOfCombat)
  ;(setCombat as jest.Mock).mockResolvedValue(inCombat)
  renderRow()
  fireEvent.press(await screen.findByRole('button', { name: 'Enter combat' }))
  expect(await screen.findByRole('button', { name: 'In combat' })).toBeTruthy()
  expect(showToast).not.toHaveBeenCalled()
})

test('entering combat on a session that already ended toasts and clears the badges', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValueOnce(outOfCombat).mockResolvedValue(null)
  ;(setCombat as jest.Mock).mockRejectedValue(new AppError('no_active_session'))
  renderRow()
  fireEvent.press(await screen.findByRole('button', { name: 'Enter combat' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.no_active_session))
  await waitFor(() => expect(screen.queryByText('Session: Active')).toBeNull())
})

test('a refused End combat keeps the badge and toasts', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValue(inCombat)
  ;(setCombat as jest.Mock).mockRejectedValue(new AppError('not_allowed'))
  renderRow()
  fireEvent.press(await screen.findByRole('button', { name: 'In combat' }))
  fireEvent.press(screen.getByRole('button', { name: 'End combat' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.not_allowed))
  expect(await screen.findByRole('button', { name: 'In combat' })).toBeTruthy()
})

test('the toast still shows when a poll clears the session while the call is in flight', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValueOnce(inCombat).mockResolvedValue(null)
  let rejectCall!: (e: unknown) => void
  ;(setCombat as jest.Mock).mockImplementation(() => new Promise((_resolve, reject) => { rejectCall = reject }))
  const client = renderRow()
  fireEvent.press(await screen.findByRole('button', { name: 'In combat' }))
  fireEvent.press(screen.getByRole('button', { name: 'End combat' }))
  await act(async () => { await client.invalidateQueries({ queryKey: qk.session('camp1') }) })
  await waitFor(() => expect(screen.queryByText('In combat')).toBeNull())
  await act(async () => { rejectCall(new AppError('no_active_session')) })
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.no_active_session))
})
