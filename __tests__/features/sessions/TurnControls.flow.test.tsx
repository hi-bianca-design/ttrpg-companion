import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { TurnControls } from '@/features/sessions/TurnControls'
import { getActiveSession, setTurn } from '@/features/sessions/sessions.api'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'

// Real hooks over a mocked API.
jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn(), setTurn: jest.fn() }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'gm1' } }) }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const member = (user_id: string, over: object = {}) => ({
  campaign_id: 'camp1', user_id, role: 'player', status: 'active', character_id: 'ch', created_at: '', updated_at: '',
  username: user_id, character_name: null, ...over,
})
const campaign = {
  id: 'camp1', gm_id: 'gm1', name: 'Odd Game', description: null, invite_code: 'ABC123', system_id: 'dnd5e-2024',
  created_at: '', updated_at: '', members: [member('gm1', { role: 'gm', character_id: null }), member('mira'), member('torin')],
}
const inCombat = { id: 's1', campaign_id: 'camp1', status: 'active', in_combat: true, current_turn_user_id: null }

function renderPanel() {
  const client = makeTestQueryClient()
  client.setQueryDefaults(['session'], { staleTime: 60_000 })
  render(<QueryClientProvider client={client}><TurnControls campaign={campaign as never} /></QueryClientProvider>)
}

beforeEach(() => jest.clearAllMocks())

test('giving the turn shows the holder and the Clear turn action', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValue(inCombat)
  ;(setTurn as jest.Mock).mockResolvedValue({ ...inCombat, current_turn_user_id: 'mira' })
  renderPanel()
  fireEvent.press(await screen.findByRole('button', { name: 'Give turn to mira' }))
  expect(await screen.findByText("mira's turn")).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Clear turn' })).toBeTruthy()
  expect(showToast).not.toHaveBeenCalled()
})

test('giving the turn to someone who just left toasts and the panel refreshes', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValue(inCombat)
  ;(setTurn as jest.Mock).mockRejectedValue(new AppError('invalid_turn_target'))
  renderPanel()
  fireEvent.press(await screen.findByRole('button', { name: 'Give turn to mira' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.invalid_turn_target))
  await waitFor(() => expect(getActiveSession).toHaveBeenCalledTimes(2))
  expect(screen.getByText('Pick whose turn it is')).toBeTruthy()
})

test('when combat ended elsewhere the panel disappears and the failed change still toasts', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValueOnce(inCombat).mockResolvedValue({ ...inCombat, in_combat: false })
  ;(setTurn as jest.Mock).mockRejectedValue(new AppError('not_in_combat'))
  renderPanel()
  fireEvent.press(await screen.findByRole('button', { name: 'Give turn to torin' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.not_in_combat))
  await waitFor(() => expect(screen.queryByText('Pick whose turn it is')).toBeNull())
})
