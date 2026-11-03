import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { TurnControls } from '@/features/sessions/TurnControls'
import { useActiveSession, useSetTurn } from '@/features/sessions/sessions.queries'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'

jest.mock('@/features/sessions/sessions.queries', () => ({ useActiveSession: jest.fn(), useSetTurn: jest.fn() }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
let mockUserId = 'gm1'
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: mockUserId } }) }))

const member = (user_id: string, over: object = {}) => ({
  campaign_id: 'camp1', user_id, role: 'player', status: 'active', character_id: 'ch', created_at: '', updated_at: '',
  username: user_id, character_name: null, ...over,
})
const campaign = {
  id: 'camp1', gm_id: 'gm1', name: 'Odd Game', description: null, invite_code: 'ABC123', system_id: 'dnd5e-2024',
  created_at: '', updated_at: '',
  members: [member('gm1', { role: 'gm', character_id: null }), member('mira'), member('torin'), member('inv', { status: 'invited', character_id: null })],
}
const inCombat = { id: 's1', campaign_id: 'camp1', in_combat: true, current_turn_user_id: null }
const mutateAsync = jest.fn()

function setup(session: object | null, user = 'gm1', isPending = false) {
  mockUserId = user
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: session })
  ;(useSetTurn as jest.Mock).mockReturnValue({ mutateAsync, isPending })
  return render(<TurnControls campaign={campaign as never} />)
}

beforeEach(() => {
  jest.clearAllMocks()
  mutateAsync.mockResolvedValue({})
})

test.each([
  ['a player', inCombat, 'mira'],
  ['the GM with no session', null, 'gm1'],
  ['the GM out of combat', { ...inCombat, in_combat: false }, 'gm1'],
])('%s sees no turn controls', (_who, session, user) => {
  setup(session, user)
  expect(screen.queryByText('Pick whose turn it is')).toBeNull()
  expect(screen.queryByRole('button', { name: /Give turn/ })).toBeNull()
})

test('in combat the GM is told to pick and can give the turn to each eligible member only', () => {
  setup(inCombat)
  expect(screen.getByText('Pick whose turn it is')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Give turn to mira' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Give turn to torin' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Give turn to gm1' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Give turn to inv' })).toBeNull()
})

test('Give turn gives it by member id', () => {
  setup(inCombat)
  fireEvent.press(screen.getByRole('button', { name: 'Give turn to mira' }))
  expect(mutateAsync).toHaveBeenCalledWith({ sessionId: 's1', userId: 'mira' })
})

test('with a holder the panel names them, marks the row, and Clear turn clears it', () => {
  setup({ ...inCombat, current_turn_user_id: 'mira' })
  expect(screen.getByText("mira's turn")).toBeTruthy()
  expect(screen.getByText('Their turn')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Give turn to mira' })).toBeNull()
  fireEvent.press(screen.getByRole('button', { name: 'Clear turn' }))
  expect(mutateAsync).toHaveBeenCalledWith({ sessionId: 's1', userId: null })
})

test('a failed change toasts the shared error copy', async () => {
  mutateAsync.mockRejectedValue(new AppError('invalid_turn_target'))
  setup(inCombat)
  fireEvent.press(screen.getByRole('button', { name: 'Give turn to mira' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.invalid_turn_target))
})

test('a holder missing from the cached member list is still shown and can be cleared', () => {
  setup({ ...inCombat, current_turn_user_id: 'just-joined' })
  expect(screen.getByText("Someone's turn")).toBeTruthy()
  expect(screen.queryByText('Pick whose turn it is')).toBeNull()
  fireEvent.press(screen.getByRole('button', { name: 'Clear turn' }))
  expect(mutateAsync).toHaveBeenCalledWith({ sessionId: 's1', userId: null })
})

test('the actions are disabled while a change is pending', () => {
  setup({ ...inCombat, current_turn_user_id: 'mira' }, 'gm1', true)
  expect(screen.getByRole('button', { name: 'Clear turn' })).toBeDisabled()
})
