import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import CampaignTab from '../../../../app/(app)/characters/[id]/campaign'
import { useCharacter } from '@/features/characters/characters.queries'
import { useCampaign, useCharacterCampaign } from '@/features/campaigns/campaigns.queries'

jest.mock('@/features/party/PartyList', () => ({
  PartyList: () => { const { Text } = require('react-native'); return <Text>party list</Text> },
}))
jest.mock('@/features/sessions/SessionStatusRow', () => ({ SessionStatusRow: () => null }))
jest.mock('@/features/sessions/TurnBanner', () => ({ TurnBanner: () => null }))
jest.mock('@/features/sessions/SessionControls', () => ({
  SessionControls: () => { const { Text } = require('react-native'); return <Text>session controls</Text> },
}))
jest.mock('@/features/characters/characters.queries', () => ({ useCharacter: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCampaign: jest.fn(), useCharacterCampaign: jest.fn() }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({ id: 'ch1' }),
  useRouter: () => mockRouter,
}))
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismiss: jest.fn(), canDismiss: jest.fn(() => false) }
jest.mock('@/components/game/ScreenBackground', () => ({
  ScreenBackground: ({ children }: { children: React.ReactNode }) => children,
}))

beforeEach(() => {
  jest.clearAllMocks()
  ;(useCharacter as jest.Mock).mockReturnValue({ data: { id: 'ch1', name: 'Mira Thistledown' }, isLoading: false })
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: null, isLoading: false, isError: false })
  ;(useCampaign as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false })
})

test('the Party tab carries the shared header: the character name and no Back arrow', () => {
  render(<CampaignTab />)
  expect(screen.getByText('Mira Thistledown')).toBeTruthy()
  expect(screen.getByText('No campaign yet')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
})

test('the tab is labelled Party in its header eyebrow', () => {
  render(<CampaignTab />)
  expect(screen.getByText('Party')).toBeTruthy()
})

test('the header shows while the campaign loads', () => {
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, isError: false })
  render(<CampaignTab />)
  expect(screen.getByText('Mira Thistledown')).toBeTruthy()
  expect(screen.getByLabelText('Loading campaign')).toBeTruthy()
})

test('opening the campaign tells the detail screen which sheet to return to', () => {
  const camp = { id: 'camp1', gm_id: 'gm1', name: 'Odd Game', description: null, invite_code: 'ABC123', system_id: 'dnd5e-2024', members: [] }
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: { id: 'camp1' }, isLoading: false, isError: false })
  ;(useCampaign as jest.Mock).mockReturnValue({ data: camp, isLoading: false, isError: false })
  render(<CampaignTab />)
  fireEvent.press(screen.getByText('Odd Game'))
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/campaigns/[id]', params: { id: 'camp1', fromCharacter: 'ch1' } })
})

test('Join a campaign passes the character, so join returns here', () => {
  render(<CampaignTab />)
  fireEvent.press(screen.getByRole('button', { name: 'Join a campaign' }))
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/campaigns/join', params: { characterId: 'ch1' } })
})

test('the Campaign tab shows the session controls once the character is in a campaign', () => {
  const camp = { id: 'camp1', gm_id: 'gm1', name: 'Odd Game', description: null, invite_code: 'ABC123', system_id: 'dnd5e-2024', members: [] }
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: { id: 'camp1' }, isLoading: false, isError: false })
  ;(useCampaign as jest.Mock).mockReturnValue({ data: camp, isLoading: false, isError: false })
  render(<CampaignTab />)
  expect(screen.getByText('session controls')).toBeTruthy()
})

test('no session controls while the character is in no campaign', () => {
  render(<CampaignTab />)
  expect(screen.queryByText('session controls')).toBeNull()
})

test('the Campaign tab shows the party once the character is in a campaign', () => {
  const camp = { id: 'camp1', gm_id: 'gm1', name: 'Odd Game', description: null, invite_code: 'ABC123', system_id: 'dnd5e-2024', members: [] }
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: { id: 'camp1' }, isLoading: false, isError: false })
  ;(useCampaign as jest.Mock).mockReturnValue({ data: camp, isLoading: false, isError: false })
  render(<CampaignTab />)
  expect(screen.getByText('party list')).toBeTruthy()
})

test('no party while the character is in no campaign', () => {
  render(<CampaignTab />)
  expect(screen.queryByText('party list')).toBeNull()
})
