import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { fireEvent, render, screen } from '@testing-library/react-native'
import CampaignDetailScreen from '../../../app/(app)/campaigns/[id]'
import { getCampaign } from '@/features/campaigns/campaigns.api'
import { getActiveSession } from '@/features/sessions/sessions.api'
import { ERROR_COPY } from '@/features/errors'
import { systemName } from '@/systems/registry'
import { variantOf } from '../../helpers/button'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
const mockRouter = { back: jest.fn(), push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) }
const mockParams: { id: string; fromCharacter?: string } = { id: 'camp1' }
const mockNavigation = { reset: jest.fn() }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
  useLocalSearchParams: () => mockParams,
}))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'gm1' } }) }))
jest.mock('@/features/campaigns/campaigns.api', () => ({ getCampaign: jest.fn() }))
jest.mock('@/features/sessions/sessions.api', () => ({ getActiveSession: jest.fn().mockResolvedValue(null), openSession: jest.fn(), endSession: jest.fn() }))

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

describe('back affordance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete mockParams.fromCharacter
    ;(getCampaign as jest.Mock).mockResolvedValue(campaign)
  })

  test('an ornate arrow Back sits at the top-left, above the title (no "Back" pill)', async () => {
    renderDetail()
    await screen.findByText('Odd Game')
    const back = screen.getByRole('button', { name: 'Back' })
    expect(screen.getByTestId('back-glyph')).toBeTruthy()
    expect(screen.queryByText('Back')).toBeNull()
    const json = JSON.stringify(screen.toJSON())
    expect(json.indexOf('"Back"')).toBeLessThan(json.indexOf('Odd Game'))
  })

  test('Back goes back, or to the campaigns list when opened directly', async () => {
    renderDetail()
    await screen.findByText('Odd Game')
    fireEvent.press(screen.getByRole('button', { name: 'Back' }))
    expect(mockRouter.back).toHaveBeenCalled()
    expect(mockNavigation.reset).not.toHaveBeenCalled()
    mockRouter.canGoBack.mockReturnValueOnce(false)
    fireEvent.press(screen.getByRole('button', { name: 'Back' }))
    expect(mockRouter.replace).toHaveBeenCalledWith('/(app)/campaigns')
  })

  test('opened from a character sheet, Back returns to its Campaign tab', async () => {
    mockParams.fromCharacter = 'ch1'
    renderDetail()
    await screen.findByText('Odd Game')
    fireEvent.press(screen.getByRole('button', { name: 'Back' }))
    expect(mockRouter.navigate).toHaveBeenCalledWith({ pathname: '/(app)/characters/[id]/campaign', params: { id: 'ch1' } })
    expect(mockRouter.back).not.toHaveBeenCalled()
    // The campaigns stack was only borrowed: the Campaigns tab must reopen on its list, not this detail.
    expect(mockNavigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'index' }] })
  })
})

test('the campaign description reads as narrative text', async () => {
  ;(getCampaign as jest.Mock).mockResolvedValue({ ...campaign, description: 'A siege in the salt marshes.' })
  renderDetail()
  const text = await screen.findByText('A siege in the salt marshes.')
  expect(text.props.className).toContain('font-narrative')
})

test('a GM sees the Open session control on the campaign screen', async () => {
  ;(getCampaign as jest.Mock).mockResolvedValue(campaign)
  renderDetail()
  expect(await screen.findByRole('button', { name: 'Open session' })).toBeTruthy()
})

test('a GM sees the turn panel while the session is in combat', async () => {
  const player = {
    campaign_id: 'camp1', user_id: 'mira', role: 'player', status: 'active', character_id: 'ch1', created_at: '', updated_at: '',
    username: 'mira', character_name: 'Mira',
  }
  ;(getCampaign as jest.Mock).mockResolvedValue({ ...campaign, members: [player] })
  ;(getActiveSession as jest.Mock).mockResolvedValue({ id: 's1', campaign_id: 'camp1', opened_by: 'gm1', in_combat: true, current_turn_user_id: null })
  renderDetail()
  expect(await screen.findByText('Pick whose turn it is')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Give turn to mira' })).toBeTruthy()
  ;(getActiveSession as jest.Mock).mockResolvedValue(null)
})
