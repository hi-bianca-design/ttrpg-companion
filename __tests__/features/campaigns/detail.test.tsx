import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { render, screen } from '@testing-library/react-native'
import CampaignDetailScreen from '../../../app/(app)/campaigns/[id]'
import { getCampaign } from '@/features/campaigns/campaigns.api'
import { ERROR_COPY } from '@/features/errors'
import { systemName } from '@/systems/registry'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'camp1' }),
}))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'gm1' } }) }))
jest.mock('@/features/campaigns/campaigns.api', () => ({ getCampaign: jest.fn() }))

function renderDetail() {
  const client = makeTestQueryClient()
  render(<QueryClientProvider client={client}><CampaignDetailScreen /></QueryClientProvider>)
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
