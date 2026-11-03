import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { CampaignSessionBadge } from '@/features/sessions/SessionBadge'
import { CampaignCombatBadge } from '@/features/sessions/CombatBadge'
import { getActiveSession, setCombat } from '@/features/sessions/sessions.api'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'

// A GM with no character, real hooks over a mocked API.
jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn(), setCombat: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCampaign: () => ({ data: { id: 'camp1', gm_id: 'gm1' } }) }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'gm1' } }) }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const outOfCombat = { id: 's1', campaign_id: 'camp1', status: 'active', in_combat: false, combat_started_by: null }
const inCombat = { ...outOfCombat, in_combat: true, combat_started_by: 'gm1' }

function renderBadges() {
  const client = makeTestQueryClient()
  client.setQueryDefaults(['session'], { staleTime: 60_000 })
  render(<QueryClientProvider client={client}><CampaignSessionBadge campaignId="camp1" /><CampaignCombatBadge campaignId="camp1" /><PortalHost /></QueryClientProvider>)
}

beforeEach(() => jest.clearAllMocks())

test('the GM enters combat, then ends it, from the campaign badges', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValue(outOfCombat)
  ;(setCombat as jest.Mock).mockResolvedValueOnce(inCombat).mockResolvedValueOnce(outOfCombat)
  renderBadges()
  fireEvent.press(await screen.findByRole('button', { name: 'Enter combat' }))
  fireEvent.press(await screen.findByRole('button', { name: 'In combat' }))
  fireEvent.press(screen.getByRole('button', { name: 'End combat' }))
  expect(await screen.findByRole('button', { name: 'Enter combat' })).toBeTruthy()
  expect(setCombat).toHaveBeenNthCalledWith(1, 's1', true)
  expect(setCombat).toHaveBeenNthCalledWith(2, 's1', false)
  expect(showToast).not.toHaveBeenCalled()
})

test('a refused End combat keeps In combat and toasts', async () => {
  ;(getActiveSession as jest.Mock).mockResolvedValue(inCombat)
  ;(setCombat as jest.Mock).mockRejectedValue(new AppError('not_allowed'))
  renderBadges()
  fireEvent.press(await screen.findByRole('button', { name: 'In combat' }))
  fireEvent.press(screen.getByRole('button', { name: 'End combat' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.not_allowed))
  expect(await screen.findByRole('button', { name: 'In combat' })).toBeTruthy()
})
