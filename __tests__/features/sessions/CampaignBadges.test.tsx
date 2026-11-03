import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { CampaignSessionBadge } from '@/features/sessions/SessionBadge'
import { CampaignCombatBadge } from '@/features/sessions/CombatBadge'
import { useActiveSession, useSetCombat } from '@/features/sessions/sessions.queries'
import { useCampaign, useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'

jest.mock('@/features/sessions/sessions.queries', () => ({ useActiveSession: jest.fn(), useSetCombat: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCampaign: jest.fn(), useCharacterCampaign: jest.fn() }))
jest.mock('@/features/characters/useCharacterRouteId', () => ({ useCharacterRouteId: jest.fn() }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
let mockUserId = 'gm1'
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: mockUserId } }) }))

const outOfCombat = { id: 's1', campaign_id: 'camp1', in_combat: false, combat_started_by: null }
const inCombat = { ...outOfCombat, in_combat: true, combat_started_by: 'p1' }
const mutateAsync = jest.fn()

function setup(session: object | null, user = 'gm1') {
  mockUserId = user
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: session })
  ;(useCampaign as jest.Mock).mockReturnValue({ data: { id: 'camp1', gm_id: 'gm1' } })
  ;(useSetCombat as jest.Mock).mockReturnValue({ mutateAsync })
  return render(<><CampaignSessionBadge campaignId="camp1" /><CampaignCombatBadge campaignId="camp1" /><PortalHost /></>)
}

beforeEach(() => {
  jest.clearAllMocks()
  mutateAsync.mockResolvedValue({})
})

test('shows Session: Active for the campaign and asks for that campaign’s session', () => {
  setup(outOfCombat)
  expect(screen.getByText('Session: Active')).toBeTruthy()
  expect(useActiveSession).toHaveBeenCalledWith('camp1')
})

test('shows nothing without an active session', () => {
  setup(null)
  expect(screen.queryByText('Session: Active')).toBeNull()
  expect(screen.queryByText('Enter combat')).toBeNull()
})

test('never looks up a character: on the campaign screen the route id is the campaign’s', () => {
  setup(outOfCombat)
  expect(useCharacterRouteId).not.toHaveBeenCalled()
  expect(useCharacterCampaign).not.toHaveBeenCalled()
})

test('a GM with no character can enter combat', () => {
  setup(outOfCombat)
  fireEvent.press(screen.getByRole('button', { name: 'Enter combat' }))
  expect(mutateAsync).toHaveBeenCalledWith({ sessionId: 's1', inCombat: true })
})

test('the GM can end combat a player started; confirming sends the change', () => {
  setup(inCombat)
  fireEvent.press(screen.getByRole('button', { name: 'In combat' }))
  expect(screen.getByText('End combat?')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'End combat' }))
  expect(mutateAsync).toHaveBeenCalledWith({ sessionId: 's1', inCombat: false })
})

test('the starter can end it; another member sees a static In combat', () => {
  setup(inCombat, 'p1')
  expect(screen.getByRole('button', { name: 'In combat' })).toBeTruthy()
  setup(inCombat, 'p2')
  expect(screen.getAllByText('In combat').length).toBeGreaterThan(0)
})
