import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { PartyList } from '@/features/party/PartyList'
import { usePartyCharacters } from '@/features/party/party.queries'
import { usePartyRealtime } from '@/features/party/usePartyRealtime'
import { ERROR_COPY } from '@/features/errors'

jest.mock('@/features/party/party.queries', () => ({ usePartyCharacters: jest.fn() }))
jest.mock('@/features/party/usePartyRealtime', () => ({ usePartyRealtime: jest.fn() }))
jest.mock('@/features/party/PartyCard', () => ({
  PartyCard: ({ character }: { character: { name: string } }) => { const { Text } = require('react-native'); return <Text>{`card:${character.name}`}</Text> },
}))

const member = (user_id: string, over: object = {}) => ({
  campaign_id: 'camp1', user_id, role: 'player', status: 'active', character_id: null, created_at: '', updated_at: '',
  username: user_id, character_name: null, ...over,
})
const campaign = (members: object[]) => ({ id: 'camp1', gm_id: 'gm1', name: 'Odd Game', members }) as never
const char = (id: string, name: string) => ({ id, name })
const refetch = jest.fn()

function setup(members: object[], party: Partial<{ data: unknown; isLoading: boolean; isError: boolean }> = {}, connected = true) {
  ;(usePartyCharacters as jest.Mock).mockReturnValue({ data: [], isLoading: false, isError: false, refetch, ...party })
  ;(usePartyRealtime as jest.Mock).mockReturnValue({ connected })
  return render(<PartyList campaign={campaign(members)} />)
}

beforeEach(() => jest.clearAllMocks())

test('shows skeleton cards while loading', () => {
  setup([member('p1', { character_id: 'c1' })], { isLoading: true, data: undefined })
  expect(screen.getByLabelText('Loading party')).toBeTruthy()
})

test('shows the empty copy when nobody has joined', () => {
  setup([member('gm1', { role: 'gm' })])
  expect(screen.getByText('No one has joined with a character yet')).toBeTruthy()
})

test('an invited viewer, who gets no party rows, sees the empty copy and no error', () => {
  setup([member('inv', { status: 'invited' })])
  expect(screen.getByText('No one has joined with a character yet')).toBeTruthy()
  expect(screen.queryByText(ERROR_COPY.load_failed)).toBeNull()
})

test('lists cards by character name, leaves the GM out, and marks a member with no character', () => {
  setup(
    [member('gm1', { role: 'gm' }), member('p1', { character_id: 'c1' }), member('p2', { character_id: 'c2' }), member('p3', { username: 'Dana' })],
    { data: [char('c2', 'Torin'), char('c1', 'Mira')] },
  )
  const names = screen.getAllByText(/^card:/).map((n) => n.props.children)
  expect(names).toEqual(['card:Mira', 'card:Torin'])
  expect(screen.getByText('Dana')).toBeTruthy()
  expect(screen.getByText('No character yet')).toBeTruthy()
  expect(screen.queryByText('gm1')).toBeNull()
})

test('a character that could not be read is marked, not hidden or crashing', () => {
  setup([member('p1', { character_id: 'c1', username: 'Eli' })], { data: [] })
  expect(screen.getByText('Eli')).toBeTruthy()
  expect(screen.getByText('Couldn’t load this character')).toBeTruthy()
})

test('an error offers Try again, which reloads the party', () => {
  setup([member('p1', { character_id: 'c1' })], { isError: true, data: undefined })
  expect(screen.getByText(ERROR_COPY.load_failed)).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Try again' }))
  expect(refetch).toHaveBeenCalled()
})

test('Reconnecting shows only while the live connection is down', () => {
  setup([member('p1', { character_id: 'c1' })], { data: [char('c1', 'Mira')] }, false)
  expect(screen.getByText('Reconnecting…')).toBeTruthy()
})

test('no Reconnecting marker while connected', () => {
  setup([member('p1', { character_id: 'c1' })], { data: [char('c1', 'Mira')] }, true)
  expect(screen.queryByText('Reconnecting…')).toBeNull()
})

test('eight members all render', () => {
  const members = Array.from({ length: 8 }, (_, i) => member(`p${i}`, { character_id: `c${i}` }))
  setup(members, { data: members.map((_, i) => char(`c${i}`, `Hero ${i}`)) })
  expect(screen.getAllByText(/^card:/)).toHaveLength(8)
})
