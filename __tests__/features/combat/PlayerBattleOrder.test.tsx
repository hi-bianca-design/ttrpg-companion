import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { AccessibilityInfo } from 'react-native'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import { updateResources } from '@/features/characters/characters.api'
import { getCombatOrder } from '@/features/combat/combat.api'
import { GM_TURN_COPY } from '@/features/combat/copy'
import { PlayerBattleOrder } from '@/features/combat/PlayerBattleOrder'
import { partyKey } from '@/features/party/party.queries'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { character, combat, orderRow } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/characters/characters.api', () => ({ ...jest.requireActual('@/features/characters/characters.api'), updateResources: jest.fn() }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))

const party = [
  character('c1', 'Mira', { owner: 'u1', hp: { current: 15, max: 30, temp: 4 }, conditions: ['poisoned'] }),
  character('c2', 'Bram', { owner: 'u2' }),
]
const baseOrder = () => [
  orderRow({ id: 'p1', user_id: 'u1', character_id: 'c1', initiative: 18, position: 1 }),
  orderRow({ id: 'g1', kind: 'enemy', name: 'Goblin 1', initiative: 15, position: 2 }),
  orderRow({ id: 'p2', user_id: 'u2', character_id: 'c2', initiative: 12, position: 3 }),
]
const campaign = { id: 'camp1', gm_id: 'gm', members: [] } as never

let client: QueryClient
function ui(c = combat({ round: 2 }), order = baseOrder()) {
  return (
    <QueryClientProvider client={client}>
      <PlayerBattleOrder campaign={campaign} combat={c} party={party} />
    </QueryClientProvider>
  )
}
function setup(c = combat({ round: 2 }), order = baseOrder()) {
  ;(getCombatOrder as jest.Mock).mockResolvedValue(order)
  client = makeTestQueryClient()
  client.setQueryData(qk.combatOrder('cb1'), order)
  client.setQueryData(partyKey('camp1', ['c1', 'c2']), party)
  return render(ui(c, order))
}
const row = (id: string) => screen.getByTestId(`row-${id}`)

beforeEach(() => {
  jest.clearAllMocks()
  ;(updateResources as jest.Mock).mockResolvedValue(undefined)
})

test('a hidden enemy holding the turn is only the pinned GM-turn row, with no name, initiative or hit points', () => {
  setup(combat({ gm_turn: true }))
  const pinned = screen.getByTestId('gm-turn-row')
  expect(within(pinned).getByText(GM_TURN_COPY)).toBeTruthy()
  expect(within(pinned).queryByText(/init/)).toBeNull()
  expect(within(pinned).queryByText(/\d+\/\d+/)).toBeNull()
  expect(screen.getAllByTestId(/^row-/)).toHaveLength(3)
})

test('no pinned row when it is not the GM turn', () => {
  setup(combat({ turn_entry_id: 'p1' }))
  expect(screen.queryByTestId('gm-turn-row')).toBeNull()
  expect(screen.queryByText(GM_TURN_COPY)).toBeNull()
})

test('extra keys a hostile server adds to an order row are never rendered', () => {
  const hostile = { ...baseOrder()[1], hp: 4321, max_hp: 4999, ac: 77, notes: 'ogre-secret-note', hidden: true }
  setup(combat(), [baseOrder()[0], hostile as never])
  const dump = JSON.stringify(screen.toJSON())
  for (const leak of ['4321', '4999', 'ogre-secret-note', 'AC 77', '77']) expect(dump).not.toContain(leak)
})

test('enemy rows show only a name and an initiative', () => {
  setup()
  const goblin = within(row('g1'))
  expect(goblin.getByText('Goblin 1')).toBeTruthy()
  expect(goblin.getByText('init 15')).toBeTruthy()
  expect(goblin.queryByText(/\d+\/\d+/)).toBeNull()
  expect(goblin.queryByLabelText('Amount')).toBeNull()
  expect(goblin.queryByRole('button')).toBeNull()
})

test('teammates are read-only with hit points as text; the viewer’s own row is the only one that expands', () => {
  setup()
  expect(within(row('p2')).getByText('22/30')).toBeTruthy()
  expect(within(row('p1')).getByText('15/30')).toBeTruthy()
  expect(within(row('p1')).getByText('+4 Temp HP')).toBeTruthy()
  expect(within(row('p2')).queryByRole('button')).toBeNull()
  expect(screen.queryByLabelText('Amount')).toBeNull()
  fireEvent.press(within(row('p1')).getByRole('button'))
  expect(screen.getAllByLabelText('Amount')).toHaveLength(1)
  expect(within(row('p1')).getByLabelText('Amount')).toBeTruthy()
})

test('conditions render on a row', () => {
  setup()
  expect(within(row('p1')).getByText('poisoned')).toBeTruthy()
})

test('the Current marker follows turn_entry_id', () => {
  setup(combat({ turn_entry_id: 'g1' }))
  expect(within(row('g1')).getByText('Current')).toBeTruthy()
  expect(within(row('g1')).getByText('▶')).toBeTruthy()
  expect(within(row('p1')).queryByText('Current')).toBeNull()
})

test('the viewer’s own row says it is theirs in its accessibility label', () => {
  setup(combat({ turn_entry_id: 'p1' }))
  expect(within(row('p1')).getByLabelText(/you.*current turn/)).toBeTruthy()
})

test('damage from the own row writes only the viewer’s character', async () => {
  setup()
  fireEvent.press(within(row('p1')).getByRole('button'))
  fireEvent.changeText(screen.getByLabelText('Amount'), '7')
  fireEvent.press(screen.getByRole('button', { name: 'Damage' }))
  await waitFor(() => expect(updateResources).toHaveBeenCalledTimes(1))
  expect((updateResources as jest.Mock).mock.calls[0][0]).toBe('c1')
})

test('shows the round', () => {
  setup(combat({ round: 4 }))
  expect(screen.getByText('Round 4')).toBeTruthy()
})

test('when combat ends while the HP entry is open it unmounts without error', async () => {
  const { rerender } = setup()
  fireEvent.press(within(row('p1')).getByRole('button'))
  expect(screen.getByLabelText('Amount')).toBeTruthy()
  ;(getCombatOrder as jest.Mock).mockResolvedValue([])
  rerender(ui(combat({ status: 'ended' }), []))
  rerender(<QueryClientProvider client={client}><></></QueryClientProvider>)
  expect(screen.queryByLabelText('Amount')).toBeNull()
})

describe('announcements', () => {
  const announce = () => jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})

  test('the GM turn is announced once when it begins, not on first render', async () => {
    const spy = announce()
    spy.mockClear()
    const { rerender } = setup(combat({ turn_entry_id: 'p1' }))
    expect(spy).not.toHaveBeenCalled()
    rerender(ui(combat({ turn_entry_id: null, gm_turn: true })))
    await waitFor(() => expect(spy).toHaveBeenCalledWith(GM_TURN_COPY))
    rerender(ui(combat({ turn_entry_id: null, gm_turn: true, rev: 5 })))
    expect(spy.mock.calls.filter(([m]) => m === GM_TURN_COPY)).toHaveLength(1)
  })

  test('a new round is announced once', async () => {
    const spy = announce()
    spy.mockClear()
    const { rerender } = setup(combat({ round: 2 }))
    rerender(ui(combat({ round: 3 })))
    await waitFor(() => expect(spy).toHaveBeenCalledWith('Round 3'))
    rerender(ui(combat({ round: 3, rev: 9 })))
    expect(spy.mock.calls.filter(([m]) => m === 'Round 3')).toHaveLength(1)
  })
})
