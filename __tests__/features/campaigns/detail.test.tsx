import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { fireEvent, render, screen } from '@testing-library/react-native'
import CampaignDetailScreen from '../../../app/(app)/campaigns/[id]'
import { getActiveSession } from '@/features/sessions/sessions.api'
import { getCampaign, getCharacterCampaign } from '@/features/campaigns/campaigns.api'
import { ERROR_COPY } from '@/features/errors'
import { systemName } from '@/systems/registry'
import { variantOf } from '../../helpers/button'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
const mockRouter = { back: jest.fn(), push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) }
const mockParams: { id: string } = { id: 'camp1' }
const mockNavigation = { reset: jest.fn() }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
  useLocalSearchParams: () => mockParams,
}))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'gm1' } }) }))
jest.mock('@/features/campaigns/campaigns.api', () => ({ getCampaign: jest.fn(), getCharacterCampaign: jest.fn() }))
jest.mock('@/features/combat/PartyPage', () => ({
  PartyPage: () => { const { Text } = require('react-native'); return <Text>party list</Text> },
}))
jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn().mockResolvedValue(null), openSession: jest.fn(), endSession: jest.fn() }))

function renderDetail() {
  const client = makeTestQueryClient()
  render(<QueryClientProvider client={client}><CampaignDetailScreen /><PortalHost /></QueryClientProvider>)
}

const campaign = {
  id: 'camp1', gm_id: 'gm1', name: 'Odd Game', description: null, invite_code: 'ABC123',
  system_id: 'dnd5e-2024', members: [],
}

test('an unknown system id does not crash the detail screen', async () => {
  ;(getCampaign as jest.Mock).mockResolvedValue({ ...campaign, system_id: 'mystery-system' })
  renderDetail()
  expect(await screen.findByText('Odd Game')).toBeTruthy()
  expect(screen.getByText('mystery-system')).toBeTruthy()
})

test('a load failure shows the shared load_failed copy', async () => {
  ;(getCampaign as jest.Mock).mockRejectedValue(new Error('boom'))
  renderDetail()
  expect(await screen.findByText(ERROR_COPY.load_failed)).toBeTruthy()
})

test('systemName falls back to the raw id', () => {
  expect(systemName('dnd5e-2024')).toBe('D&D 5e (2024)')
  expect(systemName('nope')).toBe('nope')
})

describe('no Back arrow (Home on the bar replaces it)', () => {
  beforeEach(() => {
    ;(getCampaign as jest.Mock).mockResolvedValue(campaign)
  })

  test('the loaded screen has no Back, and the GM still gets Invite', async () => {
    renderDetail()
    await screen.findByText('Odd Game')
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    expect(screen.queryByTestId('back-glyph')).toBeNull()
    expect(screen.getByRole('button', { name: 'Invite players' })).toBeTruthy()
  })

  test('the loading and failed states have no Back either', async () => {
    ;(getCampaign as jest.Mock).mockRejectedValue(new Error('boom'))
    renderDetail()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    await screen.findByText(ERROR_COPY.load_failed)
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })
})
