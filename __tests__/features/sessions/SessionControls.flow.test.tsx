import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { SessionControls } from '@/features/sessions/SessionControls'
import { endSession, getActiveSession, openSession } from '@/features/sessions/sessions.api'
import { AppError, ERROR_COPY } from '@/features/errors'

// Real hooks over a mocked api: the sequence the unit test with mocked hooks can't show.
jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn(), openSession: jest.fn(), endSession: jest.fn() }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'p1' } }) }))

const member = (user_id: string, over: object = {}) => ({
  campaign_id: 'camp1', user_id, role: 'player', status: 'active', character_id: 'ch', created_at: '', updated_at: '',
  username: user_id, character_name: null, ...over,
})
const campaign = {
  id: 'camp1', gm_id: 'gm1', name: 'Odd Game', description: null, invite_code: 'ABC123', system_id: 'dnd5e-2024',
  created_at: '', updated_at: '', members: [member('gm1', { role: 'gm', character_id: null }), member('p1')],
}
const session = { id: 's1', campaign_id: 'camp1', status: 'active', opened_by: 'p1' }

function renderControls() {
  const client = makeTestQueryClient()
  render(<QueryClientProvider client={client}><SessionControls campaign={campaign as never} /><PortalHost /></QueryClientProvider>)
}

beforeEach(() => jest.clearAllMocks())

test('ending a session the GM already ended explains it and flips to Open session', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValueOnce(session).mockResolvedValue(null)
  ;(endSession as jest.Mock).mockRejectedValue(new AppError('no_active_session'))
  renderControls()
  fireEvent.press(await screen.findByRole('button', { name: 'End session' }))
  fireEvent.press(screen.getAllByRole('button', { name: 'End session' }).at(-1)!)
  expect(await screen.findByText(ERROR_COPY.no_active_session)).toBeTruthy()
  expect(await screen.findByRole('button', { name: 'Open session' })).toBeTruthy()
})

test('opening a new session clears the old "already ended" message', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValueOnce(session).mockResolvedValue(null)
  ;(endSession as jest.Mock).mockRejectedValue(new AppError('no_active_session'))
  ;(openSession as jest.Mock).mockResolvedValue({ ...session, id: 's2' })
  renderControls()
  fireEvent.press(await screen.findByRole('button', { name: 'End session' }))
  fireEvent.press(screen.getAllByRole('button', { name: 'End session' }).at(-1)!)
  fireEvent.press(await screen.findByRole('button', { name: 'Open session' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'End session' })).toBeTruthy())
  expect(screen.queryByText(ERROR_COPY.no_active_session)).toBeNull()
})
