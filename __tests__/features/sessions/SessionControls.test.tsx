import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { SessionControls } from '@/features/sessions/SessionControls'
import { useActiveSession, useEndSession, useOpenSession } from '@/features/sessions/sessions.queries'
import { AppError, ERROR_COPY } from '@/features/errors'

jest.mock('@/features/sessions/sessions.queries', () => ({ useActiveSession: jest.fn(), useOpenSession: jest.fn(), useEndSession: jest.fn() }))
let mockUserId = 'p1'
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: mockUserId } }) }))

const member = (user_id: string, over: object = {}) => ({
  campaign_id: 'camp1', user_id, role: 'player', status: 'active', character_id: 'ch', created_at: '', updated_at: '',
  username: user_id, character_name: null, ...over,
})
const campaign = {
  id: 'camp1', gm_id: 'gm1', name: 'Odd Game', description: null, invite_code: 'ABC123', system_id: 'dnd5e-2024',
  created_at: '', updated_at: '',
  members: [member('gm1', { role: 'gm', character_id: null }), member('p1'), member('p2'), member('inv1', { status: 'invited', character_id: null })],
}
const session = { id: 's1', campaign_id: 'camp1', status: 'active', opened_by: 'p1' }
const openMutate = jest.fn()
const endMutate = jest.fn()

function setup(user: string, active: object | null = null, endError: unknown = null) {
  mockUserId = user
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: active })
  ;(useOpenSession as jest.Mock).mockReturnValue({ mutate: openMutate, error: null, isPending: false })
  ;(useEndSession as jest.Mock).mockReturnValue({ mutate: endMutate, error: endError, isPending: false })
  return render(<><SessionControls campaign={campaign as never} /><PortalHost /></>)
}

beforeEach(() => jest.clearAllMocks())

test('an active member with no session can open one', () => {
  setup('p1')
  fireEvent.press(screen.getByRole('button', { name: 'Open session' }))
  expect(openMutate).toHaveBeenCalled()
})

test('a GM with no character still gets Open session', () => {
  setup('gm1')
  expect(screen.getByRole('button', { name: 'Open session' })).toBeTruthy()
})

test('an invited member sees no controls', () => {
  setup('inv1')
  expect(screen.queryByRole('button', { name: 'Open session' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'End session' })).toBeNull()
})

test('the opener and the GM can end the session; another player cannot', () => {
  setup('p1', session)
  expect(screen.getByRole('button', { name: 'End session' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Open session' })).toBeNull()
})

test('the GM can end a session they did not open', () => {
  setup('gm1', session)
  expect(screen.getByRole('button', { name: 'End session' })).toBeTruthy()
})

test('a player who did not open the session has no End button', () => {
  setup('p2', session)
  expect(screen.queryByRole('button', { name: 'End session' })).toBeNull()
})

test('End session asks first with the agreed copy; Cancel does nothing', () => {
  setup('p1', session)
  fireEvent.press(screen.getByRole('button', { name: 'End session' }))
  expect(screen.getByText('End this session?')).toBeTruthy()
  expect(screen.getByText('Combat and any active turn will end too.')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
  expect(endMutate).not.toHaveBeenCalled()
  expect(screen.queryByText('End this session?')).toBeNull()
})

test('confirming ends the session by id', () => {
  setup('p1', session)
  fireEvent.press(screen.getByRole('button', { name: 'End session' }))
  fireEvent.press(screen.getAllByRole('button', { name: 'End session' }).at(-1)!)
  expect(endMutate).toHaveBeenCalledWith('s1')
})

test('ending a session someone else already ended shows the shared copy', () => {
  setup('p1', session, new AppError('no_active_session'))
  expect(screen.getByText(ERROR_COPY.no_active_session)).toBeTruthy()
})
