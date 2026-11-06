import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { PartyPage } from '@/features/combat/PartyPage'
import { useActiveCombat } from '@/features/combat/combat.queries'
import { useCombatRealtime } from '@/features/combat/useCombatRealtime'
import { useEncounters } from '@/features/encounters/encounters.queries'
import { useActiveSession } from '@/features/sessions/sessions.queries'
import { usePartyCharacters } from '@/features/party/party.queries'
import { usePartyRealtime } from '@/features/party/usePartyRealtime'
import { combat } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.queries', () => ({ useActiveCombat: jest.fn() }))
jest.mock('@/features/combat/useCombatRealtime', () => ({ useCombatRealtime: jest.fn() }))
jest.mock('@/features/party/party.queries', () => ({ usePartyCharacters: jest.fn() }))
jest.mock('@/features/party/usePartyRealtime', () => ({ usePartyRealtime: jest.fn() }))
jest.mock('@/features/party/PartyList', () => ({ PartyList: () => { const { Text } = require('react-native'); return <Text>party list</Text> } }))
jest.mock('@/features/encounters/encounters.queries', () => ({ useEncounters: jest.fn() }))
jest.mock('@/features/sessions/sessions.queries', () => ({ useActiveSession: jest.fn() }))
jest.mock('@/features/combat/ReviewScreen', () => ({
  ReviewScreen: (p: { initialEncounterId?: string; sessionId: string; onBack: () => void }) => {
    const { Text, Pressable } = require('react-native')
    return (
      <>
        <Text>{`review ${p.sessionId} ${p.initialEncounterId ?? 'none'}`}</Text>
        <Pressable role="button" accessibilityLabel="review back" onPress={p.onBack} />
      </>
    )
  },
}))
jest.mock('@/features/combat/EncounterPicker', () => ({
  EncounterPicker: (p: { onPick: (id: string) => void }) => {
    const { Text, Pressable } = require('react-native')
    return <Pressable role="button" accessibilityLabel="pick e1" onPress={() => p.onPick('e1')}><Text>picker</Text></Pressable>
  },
}))
jest.mock('@/features/combat/CombatStarting', () => ({ CombatStarting: () => { const { Text } = require('react-native'); return <Text>Combat is starting</Text> } }))
jest.mock('@/features/combat/GmBattleOrder', () => ({ GmBattleOrder: () => { const { Text } = require('react-native'); return <Text>gm order</Text> } }))
jest.mock('@/features/combat/PlayerBattleOrder', () => ({ PlayerBattleOrder: () => { const { Text } = require('react-native'); return <Text>player order</Text> } }))
let mockUser = 'gm1'
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: mockUser } }) }))

const members = [
  { user_id: 'p1', status: 'active', role: 'player', character_id: 'c1' },
  { user_id: 'p2', status: 'invited', role: 'player', character_id: null },
]
const campaign = { id: 'camp1', gm_id: 'gm1', members } as never

function setup(user: string, c: ReturnType<typeof combat> | null, link = { party: true, combat: true }, session: { id: string } | null = { id: 's1' }) {
  mockUser = user
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: session })
  ;(useEncounters as jest.Mock).mockReturnValue({ data: [{ id: 'e1', name: 'Ambush', enemies: [] }] })
  ;(useActiveCombat as jest.Mock).mockReturnValue({ data: c })
  ;(usePartyCharacters as jest.Mock).mockReturnValue({ data: [] })
  ;(usePartyRealtime as jest.Mock).mockReturnValue({ connected: link.party })
  ;(useCombatRealtime as jest.Mock).mockReturnValue({ connected: link.combat })
  return render(<PartyPage campaign={campaign} />)
}

beforeEach(() => jest.clearAllMocks())

test('no combat shows the Phase 1 list under the Party title', () => {
  setup('p1', null)
  expect(screen.getByText('party list')).toBeTruthy()
  expect(screen.getByText('Party')).toBeTruthy()
})

test('rolling, as the GM: the review screen with nothing pre-selected', () => {
  setup('gm1', combat({ status: 'rolling' }))
  expect(screen.getByText('review s1 none')).toBeTruthy()
  expect(screen.queryByText('party list')).toBeNull()
  expect(screen.queryAllByLabelText(/^Initiative for/)).toHaveLength(0)
})

test('rolling, as the GM: Back leaves the review for the party list and the picker', () => {
  setup('gm1', combat({ status: 'rolling' }))
  fireEvent.press(screen.getByLabelText('review back'))
  expect(screen.queryByText(/^review/)).toBeNull()
  expect(screen.getByText('party list')).toBeTruthy()
  expect(screen.getByText('picker')).toBeTruthy()
})

test('no combat, as the GM with a live session: the picker, and picking opens the review with it selected', () => {
  setup('gm1', null)
  expect(screen.getByText('Run a fight')).toBeTruthy()
  expect(screen.getByText('party list')).toBeTruthy()
  fireEvent.press(screen.getByLabelText('pick e1'))
  expect(screen.getByText('review s1 e1')).toBeTruthy()
  expect(screen.queryByText('party list')).toBeNull()
  fireEvent.press(screen.getByLabelText('review back'))
  expect(screen.getByText('picker')).toBeTruthy()
})

test('after Enter combat from the picker path the review closes and the GM order shows', () => {
  const { rerender } = setup('gm1', null)
  fireEvent.press(screen.getByLabelText('pick e1'))
  expect(screen.getByText('review s1 e1')).toBeTruthy()
  ;(useActiveCombat as jest.Mock).mockReturnValue({ data: combat({ status: 'active' }) })
  rerender(<PartyPage campaign={campaign} />)
  expect(screen.getByText('gm order')).toBeTruthy()
  expect(screen.queryByText(/^review/)).toBeNull()
})

test('no combat, as the GM with no live session: no picker', () => {
  setup('gm1', null, undefined, null)
  expect(screen.queryByText('Run a fight')).toBeNull()
  expect(screen.getByText('party list')).toBeTruthy()
})

test('no combat, as a player: no picker, and no session or encounter query for them', () => {
  setup('p1', null)
  expect(screen.queryByText('Run a fight')).toBeNull()
  expect(useEncounters).toHaveBeenCalledWith('camp1', false)
  expect(useActiveSession).toHaveBeenCalledWith(undefined)
})

test('rolling, as a player: Combat is starting, then the list', () => {
  setup('p1', combat({ status: 'rolling' }))
  expect(screen.getByText('Combat is starting')).toBeTruthy()
  expect(screen.getByText('party list')).toBeTruthy()
  expect(screen.queryByText(/^review/)).toBeNull()
})

test('active, as the GM: the GM order, titled Battle order', () => {
  setup('gm1', combat({ status: 'active' }))
  expect(screen.getByText('gm order')).toBeTruthy()
  expect(screen.getByText('Battle order')).toBeTruthy()
  expect(screen.queryByText('Party')).toBeNull()
})

test('active, as a player: the player order', () => {
  setup('p1', combat({ status: 'active' }))
  expect(screen.getByText('player order')).toBeTruthy()
  expect(screen.queryByText('gm order')).toBeNull()
})

test('a combat that ended mid-view falls back to the list with no error', () => {
  const { rerender } = setup('p1', combat({ status: 'active' }))
  expect(screen.getByText('player order')).toBeTruthy()
  ;(useActiveCombat as jest.Mock).mockReturnValue({ data: null })
  rerender(<PartyPage campaign={campaign} />)
  expect(screen.getByText('party list')).toBeTruthy()
  expect(screen.queryByText('player order')).toBeNull()
})

test('an invited member gets the list and never starts a combat query or subscription', () => {
  setup('p2', combat({ status: 'active' }))
  expect(screen.getByText('party list')).toBeTruthy()
  expect(screen.queryByText('player order')).toBeNull()
  expect(useActiveCombat).toHaveBeenCalledWith(undefined)
  expect(useCombatRealtime).toHaveBeenCalledWith('camp1', false)
})

test('an outsider is treated like an invitee', () => {
  setup('stranger', null)
  expect(useActiveCombat).toHaveBeenCalledWith(undefined)
  expect(useCombatRealtime).toHaveBeenCalledWith('camp1', false)
})

test('the GM and an active member subscribe', () => {
  setup('gm1', null)
  expect(useCombatRealtime).toHaveBeenCalledWith('camp1', true)
  expect(useActiveCombat).toHaveBeenCalledWith('camp1')
})

test.each([
  ['the party channel', { party: false, combat: true }],
  ['the combat channel', { party: true, combat: false }],
  ['both channels', { party: false, combat: false }],
])('Reconnecting… shows exactly once when %s is down', (_n, link) => {
  setup('p1', combat({ status: 'active' }), link)
  expect(screen.getAllByText('Reconnecting…')).toHaveLength(1)
})

test('no marker while both channels are up', () => {
  setup('p1', combat({ status: 'active' }))
  expect(screen.queryByText('Reconnecting…')).toBeNull()
})
