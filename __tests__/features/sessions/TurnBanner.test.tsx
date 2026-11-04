import '@testing-library/jest-native/extend-expect'
import { AccessibilityInfo } from 'react-native'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { TurnBanner } from '@/features/sessions/TurnBanner'
import { useActiveCombat, useCombatOrder, useEndMyTurn } from '@/features/combat/combat.queries'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { combat, orderRow } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.queries', () => ({ useActiveCombat: jest.fn(), useCombatOrder: jest.fn(), useEndMyTurn: jest.fn() }))
jest.mock('@/features/combat/useCombatRealtime', () => ({ useCombatRealtime: jest.fn(() => ({ connected: true })) }))
jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCharacterCampaign: () => ({ data: { id: 'camp1' } }) }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
let mockUserId: string | undefined = 'u1'
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: mockUserId ? { id: mockUserId } : null }) }))
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}), useGlobalSearchParams: () => ({ id: 'c1' }) }))

const mine = orderRow({ id: 'p1', user_id: 'u1', character_id: 'c1', position: 1 })
const theirs = orderRow({ id: 'p2', user_id: 'u2', character_id: 'c2', position: 2 })
const mutateAsync = jest.fn()

function setup(opts: { combat?: ReturnType<typeof combat> | null; order?: ReturnType<typeof orderRow>[]; user?: string | null; pending?: boolean } = {}) {
  mockUserId = opts.user === null ? undefined : (opts.user ?? 'u1')
  const c = opts.combat === undefined ? combat({ turn_entry_id: 'p1' }) : opts.combat
  ;(useActiveCombat as jest.Mock).mockReturnValue({ data: c })
  ;(useCombatOrder as jest.Mock).mockReturnValue({ data: opts.order ?? [mine, theirs] })
  ;(useEndMyTurn as jest.Mock).mockReturnValue({ mutateAsync, isPending: !!opts.pending })
  return render(<TurnBanner />)
}

beforeEach(() => {
  jest.clearAllMocks()
  mutateAsync.mockResolvedValue({})
})

test('the holder sees the banner with the agreed copy and an End Turn button', () => {
  setup()
  expect(screen.getByText('Your turn')).toBeTruthy()
  expect(screen.getByText('Take your action, bonus action, and movement')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'End Turn' })).toBeTruthy()
})

test.each([
  ['no combat', { combat: null }],
  ['someone else holds the turn', { combat: combat({ turn_entry_id: 'p2' }) }],
  ['a hidden enemy holds the turn', { combat: combat({ turn_entry_id: null }) }],
  ['combat is still rolling', { combat: combat({ status: 'rolling', turn_entry_id: 'p1' }) }],
  ['the viewer has no row (the GM, or an invitee, viewing the holder’s sheet)', { user: 'gm1' }],
  ['the order has no row for this sheet’s character', { order: [orderRow({ id: 'p1', user_id: 'u1', character_id: 'other', position: 1 })] }],
  ['no signed-in user', { user: null }],
])('no banner when %s', (_why, opts) => {
  setup(opts as never)
  expect(screen.queryByText('Your turn')).toBeNull()
})

test('End Turn ends the turn by combat id', () => {
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'End Turn' }))
  expect(mutateAsync).toHaveBeenCalledTimes(1)
  // The round on screen goes along: a stale tap after the round moved on is a server no-op.
  expect(mutateAsync).toHaveBeenCalledWith({ expectedRound: 1 })
  expect(useEndMyTurn).toHaveBeenCalledWith('camp1', 'cb1')
})

test('a failed End Turn toasts the shared error copy', async () => {
  mutateAsync.mockRejectedValue(new AppError('not_your_turn'))
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'End Turn' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.not_your_turn))
})

test('End Turn is disabled while the call is pending', () => {
  setup({ pending: true })
  expect(screen.getByRole('button', { name: 'End Turn' })).toBeDisabled()
})

test('two quick taps are one call even before the pending state arrives', () => {
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'End Turn' }))
  fireEvent.press(screen.getByRole('button', { name: 'End Turn' }))
  expect(mutateAsync).toHaveBeenCalledTimes(1)
})

test('the banner is announced to screen readers when it appears', () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  announce.mockClear()
  setup()
  expect(announce).toHaveBeenCalledWith('Your turn')
})

test('nothing is announced when the user does not hold the turn', () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  announce.mockClear()
  setup({ combat: combat({ turn_entry_id: 'p2' }) })
  expect(announce).not.toHaveBeenCalled()
})

test('it keeps itself live: the realtime signal is mounted for the sheet’s campaign', () => {
  const { useCombatRealtime } = jest.requireMock('@/features/combat/useCombatRealtime')
  setup()
  expect(useCombatRealtime).toHaveBeenCalledWith('camp1', true)
})
