import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import CampaignTab from '../../../../app/(app)/characters/[id]/campaign'
import { useCharacter } from '@/features/characters/characters.queries'
import { useCampaign, useCharacterCampaign } from '@/features/campaigns/campaigns.queries'

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

test('the Campaign tab carries the shared header: caret Back and the character name', () => {
  render(<CampaignTab />)
  expect(screen.getByText('Mira Thistledown')).toBeTruthy()
  expect(screen.getByText('No campaign yet')).toBeTruthy()
  // Nothing to dismiss (deep link): Back falls back to the characters list.
  fireEvent.press(screen.getByRole('button', { name: 'Back' }))
  expect(mockRouter.replace).toHaveBeenCalledWith('/(app)/characters')
})

test('the header shows while the campaign loads', () => {
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, isError: false })
  render(<CampaignTab />)
  expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
  expect(screen.getByLabelText('Loading campaign')).toBeTruthy()
})
