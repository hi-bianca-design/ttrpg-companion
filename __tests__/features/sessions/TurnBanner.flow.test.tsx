import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { combat, orderRow } from '../../helpers/combat'
import { TurnBanner } from '@/features/sessions/TurnBanner'
import { endMyTurn, getActiveCombat, getCombatOrder } from '@/features/combat/combat.api'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'

// Real hooks over a mocked API: the sequences a unit test with mocked queries can't show.
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/features/combat/useCombatRealtime', () => ({ useCombatRealtime: () => ({ connected: true }) }))
jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCharacterCampaign: () => ({ data: { id: 'camp1' } }) }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}), useGlobalSearchParams: () => ({ id: 'c1' }) }))

const holding = combat({ turn_entry_id: 'p1' })
const moved = combat({ turn_entry_id: 'p2' })
const order = [orderRow({ id: 'p1', user_id: 'u1', character_id: 'c1', position: 1 }), orderRow({ id: 'p2', user_id: 'u2', character_id: 'c2', position: 2 })]

function renderBanner() {
  const client = makeTestQueryClient()
  client.setQueryDefaults(['combat'], { staleTime: 60_000 })
  render(<QueryClientProvider client={client}><TurnBanner /></QueryClientProvider>)
  return client
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getCombatOrder as jest.Mock).mockResolvedValue(order)
})

test('ending the turn removes the banner with no toast', async () => {
  ;(getActiveCombat as jest.Mock).mockResolvedValueOnce(holding).mockResolvedValue(moved)
  ;(endMyTurn as jest.Mock).mockResolvedValue(moved)
  renderBanner()
  fireEvent.press(await screen.findByRole('button', { name: 'End Turn' }))
  await waitFor(() => expect(screen.queryByText('Your turn')).toBeNull())
  expect(showToast).not.toHaveBeenCalled()
})

test('ending a turn the GM already moved toasts, refetches, and the banner goes away', async () => {
  ;(getActiveCombat as jest.Mock).mockResolvedValueOnce(holding).mockResolvedValue(moved)
  ;(endMyTurn as jest.Mock).mockRejectedValue(new AppError('not_your_turn'))
  renderBanner()
  fireEvent.press(await screen.findByRole('button', { name: 'End Turn' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.not_your_turn))
  await waitFor(() => expect(screen.queryByText('Your turn')).toBeNull())
})

test('the toast still shows when the combat ends while the call is in flight', async () => {
  ;(getActiveCombat as jest.Mock).mockResolvedValueOnce(holding).mockResolvedValue(null)
  let rejectCall!: (e: unknown) => void
  ;(endMyTurn as jest.Mock).mockImplementation(() => new Promise((_resolve, reject) => { rejectCall = reject }))
  const client = renderBanner()
  fireEvent.press(await screen.findByRole('button', { name: 'End Turn' }))
  await act(async () => { await client.invalidateQueries({ queryKey: qk.combat('camp1') }) })
  await waitFor(() => expect(screen.queryByText('Your turn')).toBeNull())
  await act(async () => { rejectCall(new AppError('no_active_combat')) })
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.no_active_combat))
})

test('a second tap while the first End Turn is in flight is ignored: one call, no error toast', async () => {
  ;(getActiveCombat as jest.Mock).mockResolvedValue(holding)
  ;(endMyTurn as jest.Mock).mockImplementation(() => new Promise(() => {}))
  renderBanner()
  fireEvent.press(await screen.findByRole('button', { name: 'End Turn' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'End Turn' })).toBeDisabled())
  fireEvent.press(screen.getByRole('button', { name: 'End Turn' }))
  await act(async () => {})
  expect(endMyTurn).toHaveBeenCalledTimes(1)
  expect(showToast).not.toHaveBeenCalled()
})
