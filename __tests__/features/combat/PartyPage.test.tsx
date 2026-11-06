import '@testing-library/jest-native/extend-expect'
import { render, screen } from '@testing-library/react-native'
import { PartyPage } from '@/features/combat/PartyPage'
import { useActiveCombat } from '@/features/combat/combat.queries'
import { useCombatRealtime } from '@/features/combat/useCombatRealtime'
import { usePartyCharacters } from '@/features/party/party.queries'
import { usePartyRealtime } from '@/features/party/usePartyRealtime'
import { combat } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.queries', () => ({ useActiveCombat: jest.fn() }))
jest.mock('@/features/combat/useCombatRealtime', () => ({ useCombatRealtime: jest.fn() }))
jest.mock('@/features/party/party.queries', () => ({ usePartyCharacters: jest.fn() }))
jest.mock('@/features/party/usePartyRealtime', () => ({ usePartyRealtime: jest.fn() }))
jest.mock('@/features/party/PartyList', () => ({ PartyList: () => { const { Text } = require('react-native'); return <Text>party list</Text> } }))
jest.mock('@/features/combat/RollCall', () => ({ RollCall: () => { const { Text } = require('react-native'); return <Text>roll call</Text> } }))
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

function setup(user: string, c: ReturnType<typeof combat> | null, link = { party: true, combat: true }) {
  mockUser = user
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

test('rolling, as the GM: the roll call', () => {
  setup('gm1', combat({ status: 'rolling' }))
  expect(screen.getByText('roll call')).toBeTruthy()
  expect(screen.queryByText('party list')).toBeNull()
})

test('rolling, as a player: Combat is starting, then the list', () => {
  setup('p1', combat({ status: 'rolling' }))
  expect(screen.getByText('Combat is starting')).toBeTruthy()
  expect(screen.getByText('party list')).toBeTruthy()
  expect(screen.queryByText('roll call')).toBeNull()
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
