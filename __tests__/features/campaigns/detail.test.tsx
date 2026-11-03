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
const mockParams: { id: string; fromCharacter?: string } = { id: 'camp1' }
const mockNavigation = { reset: jest.fn() }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
  useLocalSearchParams: () => mockParams,
}))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'gm1' } }) }))
jest.mock('@/features/campaigns/campaigns.api', () => ({ getCampaign: jest.fn(), getCharacterCampaign: jest.fn() }))
jest.mock('@/features/party/PartyList', () => ({
  PartyList: () => { const { Text } = require('react-native'); return <Text>party list</Text> },
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

describe('session and combat status on the campaign screen (a GM has no character sheet)', () => {
  const active = { id: 's1', campaign_id: 'camp1', opened_by: 'gm1', in_combat: false, combat_started_by: null, current_turn_user_id: null }
  afterEach(() => { ;(getActiveSession as jest.Mock).mockResolvedValue(null) })

  test('a GM sees Session: Active and Enter combat, without any character lookup', async () => {
    ;(getCampaign as jest.Mock).mockResolvedValue(campaign)
    ;(getActiveSession as jest.Mock).mockResolvedValue(active)
    renderDetail()
    expect(await screen.findByText('Session: Active')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enter combat' })).toBeTruthy()
    expect(getCharacterCampaign).not.toHaveBeenCalled()
  })

  test('combat a player started shows as In combat, and the GM can end it', async () => {
    ;(getCampaign as jest.Mock).mockResolvedValue(campaign)
    ;(getActiveSession as jest.Mock).mockResolvedValue({ ...active, in_combat: true, combat_started_by: 'p1' })
    renderDetail()
    expect(await screen.findByRole('button', { name: 'In combat' })).toBeTruthy()
  })

  test('no status row without an active session', async () => {
    ;(getCampaign as jest.Mock).mockResolvedValue(campaign)
    ;(getActiveSession as jest.Mock).mockResolvedValue(null)
    renderDetail()
    expect(await screen.findByRole('button', { name: 'Open session' })).toBeTruthy()
    expect(screen.queryByText('Session: Active')).toBeNull()
    expect(screen.queryByText('Enter combat')).toBeNull()
  })
})

test('the campaign screen shows the party for the GM, who has no character sheet', async () => {
  ;(getCampaign as jest.Mock).mockResolvedValue(campaign)
  renderDetail()
  expect(await screen.findByText('party list')).toBeTruthy()
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

describe('inviting players', () => {
  test('the GM has an Invite players button in the header and no inline code card', async () => {
    ;(getCampaign as jest.Mock).mockResolvedValue(campaign)
    renderDetail()
    expect(await screen.findByRole('button', { name: 'Invite players' })).toBeTruthy()
    expect(screen.queryByText('Invite code')).toBeNull()
    expect(screen.queryByText('ABC123')).toBeNull()
  })

  test('the invite control is a labelled outline button, not a bare glyph', async () => {
    ;(getCampaign as jest.Mock).mockResolvedValue(campaign)
    renderDetail()
    const button = await screen.findByRole('button', { name: 'Invite players' })
    expect(variantOf(button)).toBe('outline')
    expect(screen.getByText('Invite')).toBeTruthy()
  })

  test('pressing it opens the sheet with the code', async () => {
    ;(getCampaign as jest.Mock).mockResolvedValue(campaign)
    renderDetail()
    fireEvent.press(await screen.findByRole('button', { name: 'Invite players' }))
    expect(await screen.findByText('ABC123')).toBeTruthy()
  })

  test('a player sees no invite button', async () => {
    ;(getCampaign as jest.Mock).mockResolvedValue({ ...campaign, gm_id: 'someone-else' })
    renderDetail()
    await screen.findByText('Odd Game')
    expect(screen.queryByRole('button', { name: 'Invite players' })).toBeNull()
  })

  test('the load failure state has no invite button', async () => {
    ;(getCampaign as jest.Mock).mockRejectedValue(new Error('boom'))
    renderDetail()
    await screen.findByText(ERROR_COPY.load_failed)
    expect(screen.queryByRole('button', { name: 'Invite players' })).toBeNull()
  })
})
