import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'
import JoinCampaignScreen from '../../../app/(app)/campaigns/join'
import { joinCampaign, previewInvite } from '@/features/campaigns/campaigns.api'
import { listCharacters } from '@/features/characters/characters.api'
import { AppError, ERROR_COPY, type AppErrorCode } from '@/features/errors'
import { showToast } from '@/components/ui/toast'
import { variantOf } from '../../helpers/button'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
const mockRouter = { replace: jest.fn(), back: jest.fn(), push: jest.fn(), navigate: jest.fn() }
const mockNavigation = { reset: jest.fn() }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
  useLocalSearchParams: jest.fn(() => ({})),
}))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.api', () => ({ joinCampaign: jest.fn(), previewInvite: jest.fn() }))
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
  ;(previewInvite as jest.Mock).mockResolvedValue({ id: 'camp1', name: 'Odd Game', system_id: 'dnd5e-2024' })
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

test('Cancel is a ghost text button at the leading edge, above the title', async () => {
  renderJoin()
  await screen.findByRole('button', { name: 'Character Thorin' })
  const cancel = screen.getByRole('button', { name: 'Cancel' })
  expect(variantOf(cancel)).toBe('ghost')
  expect(variantOf(cancel)).not.toBe('outline')
  const json = JSON.stringify(screen.toJSON())
  expect(json.indexOf('Cancel')).toBeLessThan(json.indexOf('Join a campaign'))
})

test('Cancel from the campaigns list goes back', async () => {
  renderJoin()
  await screen.findByRole('button', { name: 'Character Thorin' })
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
  expect(mockRouter.back).toHaveBeenCalled()
  expect(mockRouter.navigate).not.toHaveBeenCalled()
})

test('a successful join toasts and opens the campaign', async () => {
  ;(joinCampaign as jest.Mock).mockResolvedValue('camp1')
  renderJoin()
  fireEvent.changeText(screen.getByLabelText('Invite code'), 'AB12CD')
  await pickCharacter('Elara')
  fireEvent.press(screen.getByRole('button', { name: 'Join' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith('Elara joined the campaign.'))
  expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/(app)/campaigns/[id]', params: { id: 'camp1' } })
})

test('a failed join does not toast', async () => {
  ;(joinCampaign as jest.Mock).mockRejectedValue(new AppError('invalid_code'))
  renderJoin()
  fireEvent.changeText(screen.getByLabelText('Invite code'), 'AB12CD')
  await pickCharacter('Elara')
  fireEvent.press(screen.getByRole('button', { name: 'Join' }))
  expect(await screen.findByText(ERROR_COPY.invalid_code)).toBeTruthy()
  expect(showToast).not.toHaveBeenCalled()
})

describe('opened from a character sheet', () => {
  const sheet = { pathname: '/(app)/characters/[id]/campaign', params: { id: 'ch1' } }
  beforeEach(() => (useLocalSearchParams as jest.Mock).mockReturnValue({ characterId: 'ch1' }))

  test('a successful join returns to that character’s Campaign tab', async () => {
    ;(joinCampaign as jest.Mock).mockResolvedValue('camp1')
    renderJoin()
    await screen.findByRole('button', { name: 'Character Thorin', selected: true })
    fireEvent.changeText(screen.getByLabelText('Invite code'), 'AB12CD')
    fireEvent.press(screen.getByRole('button', { name: 'Join' }))
    await waitFor(() => expect(mockRouter.navigate).toHaveBeenCalledWith(sheet))
    expect(showToast).toHaveBeenCalledWith('Thorin joined the campaign.')
    expect(mockRouter.replace).not.toHaveBeenCalled()
    expect(mockNavigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'index' }] })
  })

  test('Cancel returns to that character’s Campaign tab', async () => {
    renderJoin()
    await screen.findByRole('button', { name: 'Character Thorin' })
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockRouter.navigate).toHaveBeenCalledWith(sheet)
    expect(mockRouter.back).not.toHaveBeenCalled()
    expect(mockNavigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'index' }] })
  })
})

describe('prefilled from an invite link', () => {
  test.each([
    ['ab12cd ', 'AB12CD'],
    ['ABCDEFGH', 'ABCDEF'],
    [['xy9z88'], 'XY9Z88'],
    [undefined, ''],
  ])('code param %p shows %p', (param, shown) => {
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({ code: param })
    renderJoin()
    expect(screen.getByLabelText('Invite code').props.value).toBe(shown)
  })

  test('never joins by itself', async () => {
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({ code: 'AB12CD', characterId: 'ch1' })
    renderJoin()
    await screen.findByRole('button', { name: 'Character Thorin', selected: true })
    expect(joinCampaign).not.toHaveBeenCalled()
  })
})

describe('campaign preview', () => {
  test('a full code shows which campaign it opens and retitles the screen', async () => {
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({ code: 'AB12CD' })
    renderJoin()
    expect(await screen.findByText('Join Odd Game')).toBeTruthy()
    expect(previewInvite).toHaveBeenCalledWith('AB12CD')
  })

  test('typing a full code looks the campaign up; a partial code does not', async () => {
    renderJoin()
    fireEvent.changeText(screen.getByLabelText('Invite code'), 'AB12')
    expect(previewInvite).not.toHaveBeenCalled()
    fireEvent.changeText(screen.getByLabelText('Invite code'), 'AB12CD')
    expect(await screen.findByText('Join Odd Game')).toBeTruthy()
  })

  test('an unknown code shows the invalid_code copy before joining', async () => {
    ;(previewInvite as jest.Mock).mockRejectedValue(new AppError('invalid_code'))
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({ code: 'ZZZZZZ' })
    renderJoin()
    expect(await screen.findByText(ERROR_COPY.invalid_code)).toBeTruthy()
    expect(screen.getByText('Join a campaign')).toBeTruthy()
  })

  test('a failed lookup (e.g. offline) leaves the plain form usable', async () => {
    ;(previewInvite as jest.Mock).mockRejectedValue(new AppError('network'))
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({ code: 'AB12CD' })
    renderJoin()
    await pickCharacter('Thorin')
    expect(screen.getByText('Join a campaign')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Join' })).toBeEnabled()
  })

  test('with one character in the campaign’s system, it is chosen for you: one tap to join', async () => {
    ;(listCharacters as jest.Mock).mockResolvedValue([CHARACTERS[0], { ...CHARACTERS[1], system_id: 'other' }])
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({ code: 'AB12CD' })
    renderJoin()
    await screen.findByRole('button', { name: 'Character Thorin', selected: true })
    expect(screen.getByRole('button', { name: 'Join' })).toBeEnabled()
  })

  test('with several matching characters nothing is chosen for you', async () => {
    ;(useLocalSearchParams as jest.Mock).mockReturnValue({ code: 'AB12CD' })
    renderJoin()
    await screen.findByText('Join Odd Game')
    await screen.findByRole('button', { name: 'Character Thorin' })
    expect(screen.queryByRole('button', { name: /Character .*/, selected: true })).toBeNull()
    expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled()
  })
})
