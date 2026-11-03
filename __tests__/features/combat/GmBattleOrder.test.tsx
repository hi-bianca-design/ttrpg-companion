import 'react-native-gesture-handler/jestSetup'
import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { PortalHost } from '@rn-primitives/portal'
import { AccessibilityInfo } from 'react-native'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import {
  applyEnemyHp, delayTurn, getCombatEntries, moveEntry, nextTurn, removeEntry, setCurrentEntry, undoEnemyHp, updateEnemy,
  type CombatEntry,
} from '@/features/combat/combat.api'
import { GmBattleOrder } from '@/features/combat/GmBattleOrder'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { character, combat, enemy, entry } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const m = {
  entries: getCombatEntries as jest.Mock, apply: applyEnemyHp as jest.Mock, undo: undoEnemyHp as jest.Mock,
  next: nextTurn as jest.Mock, delay: delayTurn as jest.Mock, current: setCurrentEntry as jest.Mock,
  move: moveEntry as jest.Mock, update: updateEnemy as jest.Mock, remove: removeEntry as jest.Mock,
}
const party = [character('c1', 'Mira'), character('c2', 'Bram')]
const live = combat({ round: 2 })

const baseEntries = (): CombatEntry[] => [
  entry({ id: 'p1', user_id: 'u1', character_id: 'c1', position: 1, initiative: 18, is_current: true }),
  entry({ id: 'p2', user_id: 'u2', character_id: 'c2', position: 2, initiative: 15 }),
  ...[1, 2, 3, 4].map((n) => enemy({ id: `g${n}`, name: `Goblin ${n}`, group_id: 'grp', position: 2 + n, initiative: 12 })),
  enemy({ id: 'g5', name: 'Goblin 5', group_id: 'later', position: 7, initiative: 12 }),
  enemy({ id: 'o1', name: 'Ogre', hidden: true, hp: 30, max_hp: 59, ac: 11, position: 8, initiative: 8 }),
]

let client: QueryClient
function setup(entries: CombatEntry[] = baseEntries()) {
  m.entries.mockResolvedValue(entries)
  client = makeTestQueryClient()
  client.setQueryData(qk.combatEntries('cb1'), entries)
  return render(
    <QueryClientProvider client={client}>
      <GmBattleOrder campaign={{ id: 'camp1', gm_id: 'gm', members: [] } as never} combat={live} party={party} />
      <PortalHost />
    </QueryClientProvider>,
  )
}
const row = (id: string) => screen.getByTestId(`row-${id}`)
const expand = (name: string) => fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${name},`) }))
const select = (name: string) => fireEvent.press(screen.getByRole('button', { name: `Select ${name}` }))

beforeEach(() => {
  jest.clearAllMocks()
  let n = 0
  m.apply.mockImplementation(async () => `batch-${++n}`)
  for (const k of ['undo', 'next', 'delay', 'current', 'move', 'update', 'remove'] as const) m[k].mockResolvedValue(1)
})

test('shows the round, one list in turn order, and the current row marked in text, symbol and label', () => {
  setup()
  expect(screen.getByText('Round 2')).toBeTruthy()
  expect(within(row('p1')).getByText('Current')).toBeTruthy()
  expect(within(row('p1')).getByText('▶')).toBeTruthy()
  expect(within(row('p1')).getByLabelText(/current turn/)).toBeTruthy()
  expect(within(row('p2')).queryByText('Current')).toBeNull()
})

test('a hidden enemy shows Hidden and a Reveal action; Reveal sends hidden false', async () => {
  setup()
  expect(within(row('o1')).getByText('Hidden')).toBeTruthy()
  expand('Ogre')
  fireEvent.press(screen.getByRole('button', { name: 'Reveal' }))
  await waitFor(() => expect(m.update).toHaveBeenCalledWith('o1', { hidden: false }))
})

test('an enemy at 0 says Down', () => {
  setup([enemy({ id: 'g1', name: 'Goblin 1', hp: 0, position: 1 })])
  expect(screen.getByText('Down')).toBeTruthy()
})

test('selecting four goblins and entering 5 applies once to the four ids, then the selection is gone', async () => {
  setup()
  for (const n of [1, 2, 3, 4]) select(`Goblin ${n}`)
  expect(screen.getByText('4 selected')).toBeTruthy()
  fireEvent.changeText(screen.getByLabelText('Amount'), '5')
  fireEvent.press(screen.getByRole('button', { name: 'Damage' }))
  await waitFor(() => expect(screen.queryByText('4 selected')).toBeNull(), { timeout: 4000 })
  expect(m.apply).toHaveBeenCalledTimes(1)
  expect(m.apply).toHaveBeenCalledWith('cb1', ['g1', 'g2', 'g3', 'g4'], 'damage', 5)
  expect(screen.queryByLabelText('Amount')).toBeNull()
})

test('bulk Heal and Temp HP pass their modes', async () => {
  setup()
  select('Goblin 1')
  fireEvent.changeText(screen.getByLabelText('Amount'), '2')
  fireEvent.press(screen.getByRole('button', { name: 'Heal' }))
  await waitFor(() => expect(m.apply).toHaveBeenCalledWith('cb1', ['g1'], 'heal', 2))
  select('Goblin 2')
  fireEvent.changeText(screen.getByLabelText('Amount'), '3')
  fireEvent.press(screen.getByRole('button', { name: 'Temp HP' }))
  await waitFor(() => expect(m.apply).toHaveBeenCalledWith('cb1', ['g2'], 'temp', 3))
})

test('Select group selects exactly the group, not the goblin added later', () => {
  setup()
  expand('Goblin 1')
  fireEvent.press(screen.getByRole('button', { name: 'Select group' }))
  expect(screen.getByText('4 selected')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Select Goblin 4' })).toHaveAccessibilityState({ selected: true })
  expect(screen.getByRole('button', { name: 'Select Goblin 5' })).toHaveAccessibilityState({ selected: false })
})

test('a lone enemy has no Select group', () => {
  setup()
  expand('Ogre')
  expect(screen.queryByRole('button', { name: 'Select group' })).toBeNull()
})

test('after a bulk hit every affected row has Undo, and one tap undoes the batch once', async () => {
  setup()
  for (const n of [1, 2]) select(`Goblin ${n}`)
  fireEvent.changeText(screen.getByLabelText('Amount'), '5')
  fireEvent.press(screen.getByRole('button', { name: 'Damage' }))
  await waitFor(() => expect(within(row('g1')).getByRole('button', { name: 'Undo' })).toBeTruthy())
  expect(within(row('g2')).getByRole('button', { name: 'Undo' })).toBeTruthy()
  expect(within(row('g3')).queryByRole('button', { name: 'Undo' })).toBeNull()
  fireEvent.press(within(row('g2')).getByRole('button', { name: 'Undo' }))
  await waitFor(() => expect(m.undo).toHaveBeenCalledTimes(1))
  expect(m.undo).toHaveBeenCalledWith('cb1', 'batch-1')
  await waitFor(() => expect(within(row('g1')).queryByRole('button', { name: 'Undo' })).toBeNull())
})

test('Next turn names the current entry', async () => {
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
  await waitFor(() => expect(m.next).toHaveBeenCalledWith('cb1', 'p1'))
})

test('a stale Next turn refetches and says nothing', async () => {
  setup()
  m.entries.mockClear()
  fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
  await waitFor(() => expect(m.entries).toHaveBeenCalled())
  expect(showToast).not.toHaveBeenCalled()
})

test('Delay is on the current row only and delays it', async () => {
  setup()
  expect(within(row('p2')).queryByRole('button', { name: /^Delay/ })).toBeNull()
  fireEvent.press(within(row('p1')).getByRole('button', { name: /^Delay/ }))
  await waitFor(() => expect(m.delay).toHaveBeenCalledWith('cb1', 'p1'))
})

test('Make current makes that row current', async () => {
  setup()
  expect(within(row('p1')).queryByRole('button', { name: /^Make current/ })).toBeNull()
  fireEvent.press(within(row('g1')).getByRole('button', { name: /^Make current/ }))
  await waitFor(() => expect(m.current).toHaveBeenCalledWith('g1'))
})

test('Move up and Move down ask for the neighbouring position', async () => {
  setup()
  fireEvent.press(within(row('g1')).getByRole('button', { name: /^Move up/ }))
  await waitFor(() => expect(m.move).toHaveBeenCalledWith('g1', 2))
  fireEvent.press(within(row('g1')).getByRole('button', { name: /^Move down/ }))
  await waitFor(() => expect(m.move).toHaveBeenCalledWith('g1', 4))
})

test('the ends of the list cannot be moved off it', () => {
  setup()
  expect(within(row('p1')).getByRole('button', { name: /^Move up/ })).toBeDisabled()
  expect(within(row('o1')).getByRole('button', { name: /^Move down/ })).toBeDisabled()
})

test('Remove needs the confirm and then removes that entry', async () => {
  setup()
  expand('Goblin 5')
  fireEvent.press(screen.getByRole('button', { name: 'Remove' }))
  expect(m.remove).not.toHaveBeenCalled()
  fireEvent.press(screen.getByRole('button', { name: 'Remove Goblin 5' }))
  await waitFor(() => expect(m.remove).toHaveBeenCalledWith('g5'))
})

test('Set HP sends a typed exact value for that enemy', async () => {
  setup()
  expand('Goblin 5')
  fireEvent.changeText(screen.getByLabelText('Set HP to'), '3')
  fireEvent.press(screen.getByRole('button', { name: 'Set HP' }))
  await waitFor(() => expect(m.update).toHaveBeenCalledWith('g5', { hp: 3 }))
})

test('player rows have no HP entry, no Select toggle and no edit control of any kind', () => {
  setup()
  for (const id of ['p1', 'p2']) {
    const r = within(row(id))
    expect(r.queryByLabelText('Amount')).toBeNull()
    for (const name of [/Damage/, /Heal/, /Temp HP/, /^Select/, /^Set HP/, /^Remove/, /^Reveal/, /^Hide/]) {
      expect(r.queryByRole('button', { name })).toBeNull()
    }
    expect(r.queryAllByLabelText(/Amount|Notes|Set HP/)).toHaveLength(0)
  }
  expect(within(row('p1')).getByText('22/30')).toBeTruthy()
  expect(within(row('p1')).getByText('Mira')).toBeTruthy()
})

test('a 60-character enemy name stays on one line', () => {
  const name = 'G'.repeat(60)
  setup([enemy({ id: 'g1', name, position: 1 })])
  expect(screen.getByText(name).props.numberOfLines).toBe(1)
})

test('8 players and 12 enemies render without error', () => {
  const players = Array.from({ length: 8 }, (_, i) => entry({ id: `pp${i}`, user_id: `u${i}`, character_id: 'c1', position: i + 1 }))
  const enemies = Array.from({ length: 12 }, (_, i) => enemy({ id: `ee${i}`, name: `Orc ${i + 1}`, position: 9 + i }))
  setup([...players, ...enemies])
  expect(screen.getAllByRole('button', { name: /^Select Orc/ })).toHaveLength(12)
  expect(screen.getAllByText('Mira')).toHaveLength(8)
})

test('with no enemies it says so and still offers Add enemy', () => {
  setup([baseEntries()[0], baseEntries()[1]])
  expect(screen.getByText('No enemies yet')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Add enemy' }))
  expect(screen.getByLabelText('Max HP')).toBeTruthy()
})

test('an ended-combat error from an action toasts and refetches', async () => {
  m.next.mockRejectedValue(new AppError('no_active_combat'))
  setup()
  m.entries.mockClear()
  fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.no_active_combat))
  await waitFor(() => expect(m.entries).toHaveBeenCalled())
})

test('a double tapped Next turn is one call', async () => {
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
  fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
  await waitFor(() => expect(m.next).toHaveBeenCalledTimes(1))
})

test('a new round is announced, the first render is not', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  announce.mockClear()
  const { rerender } = setup()
  expect(announce).not.toHaveBeenCalled()
  rerender(
    <QueryClientProvider client={client}>
      <GmBattleOrder campaign={{ id: 'camp1', gm_id: 'gm', members: [] } as never} combat={{ ...live, round: 3 }} party={party} />
      <PortalHost />
    </QueryClientProvider>,
  )
  await waitFor(() => expect(announce).toHaveBeenCalledWith('Round 3'))
})
