import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'
import JoinCampaignScreen from '../../../app/(app)/campaigns/join'
import { joinCampaign } from '@/features/campaigns/campaigns.api'
import { listCharacters } from '@/features/characters/characters.api'
import { AppError, ERROR_COPY, type AppErrorCode } from '@/features/errors'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: jest.fn(() => ({})),
}))
jest.mock('@/features/campaigns/campaigns.api', () => ({ joinCampaign: jest.fn() }))
jest.mock('@/features/characters/characters.api', () => ({ listCharacters: jest.fn() }))

const CHARACTERS = [
  { id: 'ch1', name: 'Thorin', level: 3, system_id: 'dnd5e-2024', class_name: 'Fighter', hp: null },
  { id: 'ch2', name: 'Elara', level: 2, system_id: 'dnd5e-2024', class_name: 'Wizard', hp: null },
]

function renderJoin() {
  const client = makeTestQueryClient()
  render(
    <QueryClientProvider client={client}>
      <JoinCampaignScreen />
      <PortalHost />
    </QueryClientProvider>,
  )
}

async function pickCharacter(name: string) {
  fireEvent.press(await screen.findByRole('button', { name: `Character ${name}` }))
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(listCharacters as jest.Mock).mockResolvedValue(CHARACTERS)
  ;(useLocalSearchParams as jest.Mock).mockReturnValue({})
})

test('the code input uppercases what is typed', () => {
  renderJoin()
  fireEvent.changeText(screen.getByLabelText('Invite code'), 'ab12cd')
  expect(screen.getByLabelText('Invite code').props.value).toBe('AB12CD')
})

test('Join stays disabled until the code has 6 characters and a character is chosen', async () => {
  renderJoin()
  const join = () => screen.getByRole('button', { name: 'Join' })
  expect(join()).toBeDisabled()
  fireEvent.changeText(screen.getByLabelText('Invite code'), 'AB12')
  await pickCharacter('Thorin')
  expect(join()).toBeDisabled()
  fireEvent.changeText(screen.getByLabelText('Invite code'), 'AB12CD')
  expect(join()).toBeEnabled()
})

test('Join stays disabled with a full code but no character', async () => {
  renderJoin()
  await screen.findByRole('button', { name: 'Character Thorin' })
  fireEvent.changeText(screen.getByLabelText('Invite code'), 'AB12CD')
  expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled()
})

test('joins with the typed code and chosen character', async () => {
  ;(joinCampaign as jest.Mock).mockResolvedValue('camp1')
  renderJoin()
  fireEvent.changeText(screen.getByLabelText('Invite code'), 'ab12cd')
  await pickCharacter('Elara')
  fireEvent.press(screen.getByRole('button', { name: 'Join' }))
  await waitFor(() => expect(joinCampaign).toHaveBeenCalledWith('AB12CD', 'ch2'))
})

test('pre-selects the character from the route param', async () => {
  ;(useLocalSearchParams as jest.Mock).mockReturnValue({ characterId: 'ch1' })
  renderJoin()
  await screen.findByRole('button', { name: 'Character Thorin', selected: true })
  fireEvent.changeText(screen.getByLabelText('Invite code'), 'AB12CD')
  expect(screen.getByRole('button', { name: 'Join' })).toBeEnabled()
})

test.each<AppErrorCode>(['invalid_code', 'already_member', 'system_mismatch', 'not_your_character', 'network'])(
  'shows the %s copy under the code input',
  async (code) => {
    ;(joinCampaign as jest.Mock).mockRejectedValue(new AppError(code))
    renderJoin()
    fireEvent.changeText(screen.getByLabelText('Invite code'), 'AB12CD')
    await pickCharacter('Thorin')
    fireEvent.press(screen.getByRole('button', { name: 'Join' }))
    expect(await screen.findByText(ERROR_COPY[code])).toBeTruthy()
  },
)
