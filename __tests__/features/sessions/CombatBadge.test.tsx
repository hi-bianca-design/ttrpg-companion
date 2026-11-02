import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { CombatBadge } from '@/features/sessions/CombatBadge'
import { useCharacterSession } from '@/features/sessions/useCharacterSession'
import { useSetCombat } from '@/features/sessions/sessions.queries'
import { useCampaign, useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'

jest.mock('@/features/sessions/useCharacterSession', () => ({ useCharacterSession: jest.fn() }))
jest.mock('@/features/sessions/sessions.queries', () => ({ useSetCombat: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCharacterCampaign: jest.fn(), useCampaign: jest.fn() }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
let mockUserId: string | undefined = 'p2'
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: mockUserId ? { id: mockUserId } : null }) }))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({ id: 'ch1' }),
}))

const outOfCombat = { id: 's1', campaign_id: 'camp1', in_combat: false, combat_started_by: null }
const inCombat = { ...outOfCombat, in_combat: true, combat_started_by: 'p1' }
const mutate = jest.fn()
const mutateAsync = jest.fn()

function setup(session: object | null, user: string | undefined = 'p2', gmId: string | undefined = 'gm1') {
  mockUserId = user
  ;(useCharacterSession as jest.Mock).mockReturnValue(session)
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: { id: 'camp1' } })
  ;(useCampaign as jest.Mock).mockReturnValue({ data: gmId ? { id: 'camp1', gm_id: gmId } : undefined })
  ;(useSetCombat as jest.Mock).mockReturnValue({ mutate, mutateAsync })
  return render(<><CombatBadge /><PortalHost /></>)
}

beforeEach(() => {
  jest.clearAllMocks()
  mutateAsync.mockResolvedValue({})
})

test('renders nothing without an active session', () => {
  setup(null)
  expect(screen.queryByText('Enter combat')).toBeNull()
  expect(screen.queryByText('In combat')).toBeNull()
})

test('out of combat any member can enter combat', () => {
  setup(outOfCombat)
  fireEvent.press(screen.getByRole('button', { name: 'Enter combat' }))
  expect(mutateAsync).toHaveBeenCalledWith({ sessionId: 's1', inCombat: true })
})

test.each([
  ['the GM', 'gm1'],
  ['whoever started combat', 'p1'],
])('%s can open End combat from the In combat badge', (_who, user) => {
  setup(inCombat, user)
  fireEvent.press(screen.getByRole('button', { name: 'In combat' }))
  expect(screen.getByText('End combat?')).toBeTruthy()
  expect(screen.getByText('The current turn will be cleared.')).toBeTruthy()
})

test('Cancel leaves combat on; confirming ends it', () => {
  setup(inCombat, 'gm1')
  fireEvent.press(screen.getByRole('button', { name: 'In combat' }))
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
  expect(mutateAsync).not.toHaveBeenCalled()
  fireEvent.press(screen.getByRole('button', { name: 'In combat' }))
  fireEvent.press(screen.getByRole('button', { name: 'End combat' }))
  expect(mutateAsync).toHaveBeenCalledWith({ sessionId: 's1', inCombat: false })
})

test('another member sees In combat but cannot end it', () => {
  setup(inCombat, 'p2')
  expect(screen.getByText('In combat')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'In combat' })).toBeNull()
})

test('while the GM id is still loading a non-starter cannot end combat', () => {
  setup(inCombat, 'p2', undefined)
  expect(screen.getByText('In combat')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'In combat' })).toBeNull()
})

test('with no signed-in user nobody matches an unknown starter', () => {
  setup({ ...inCombat, combat_started_by: null }, undefined, undefined)
  expect(screen.queryByRole('button', { name: 'In combat' })).toBeNull()
})

test('a failed change toasts the shared error copy', async () => {
  mutateAsync.mockRejectedValue(new AppError('no_active_session'))
  setup(outOfCombat)
  fireEvent.press(screen.getByRole('button', { name: 'Enter combat' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.no_active_session))
})

test('the icon and label of Enter combat sit side by side, like Session: Active', () => {
  setup(outOfCombat)
  let node = screen.getByText('Enter combat').parent
  for (let i = 0; i < 4 && node && !String(node.props.className ?? '').includes('flex-row'); i++) node = node.parent
  expect(String(node?.props.className)).toContain('flex-row')
})

test.each([['Enter combat', outOfCombat], ['In combat', inCombat]])('%s keeps a 44pt touch target', (name, session) => {
  setup(session, 'gm1')
  const { top, bottom } = screen.getByRole('button', { name }).props.hitSlop
  // the badge is about 22pt tall; slop on both sides brings the target to 44pt
  expect(top + bottom + 22).toBeGreaterThanOrEqual(44)
})
