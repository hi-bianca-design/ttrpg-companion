import '@testing-library/jest-native/extend-expect'
import { render, screen } from '@testing-library/react-native'
import { CampaignSessionStatus } from '@/features/sessions/CampaignSessionStatus'
import { useActiveSession, useSetCombat } from '@/features/sessions/sessions.queries'

jest.mock('@/features/sessions/sessions.queries', () => ({ useActiveSession: jest.fn(), useSetCombat: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCampaign: () => ({ data: { id: 'camp1', gm_id: 'gm1' } }) }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'gm1' } }) }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const session = { id: 's1', campaign_id: 'camp1', in_combat: false, combat_started_by: null }

beforeEach(() => {
  jest.clearAllMocks()
  ;(useSetCombat as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() })
})

test('renders nothing, not an empty row, without an active session', () => {
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: null })
  render(<CampaignSessionStatus campaignId="camp1" />)
  expect(screen.toJSON()).toBeNull()
})

test('shows Session: Active and Enter combat for an active session', () => {
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: session })
  render(<CampaignSessionStatus campaignId="camp1" />)
  expect(screen.getByText('Session: Active')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Enter combat' })).toBeTruthy()
  expect(useActiveSession).toHaveBeenCalledWith('camp1')
})

test('shows In combat once combat has started', () => {
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: { ...session, in_combat: true, combat_started_by: 'p1' } })
  render(<CampaignSessionStatus campaignId="camp1" />)
  expect(screen.getByRole('button', { name: 'In combat' })).toBeTruthy()
})

test('the status row holds exactly two children when the viewer can end combat, so the badge stays at the right edge', () => {
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: { ...session, in_combat: true, combat_started_by: 'gm1' } })
  render(<CampaignSessionStatus campaignId="camp1" />)
  const row = screen.toJSON() as { children: unknown[] }
  expect(row.children).toHaveLength(2)
})
