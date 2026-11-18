import 'react-native-gesture-handler/jestSetup'
import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { AccessibilityInfo } from 'react-native'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import { moveEntry, nextTurn, setCurrentEntry, getCombatEntries, type CombatEntry } from '@/features/combat/combat.api'
import { useCombatEntries } from '@/features/combat/combat.queries'
import { buildGmOrder } from '@/features/combat/battleOrder'
import { InitiativeStrip } from '@/features/combat/InitiativeStrip'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { character, combat, enemy, entry } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const m = { next: nextTurn as jest.Mock, set: setCurrentEntry as jest.Mock, move: moveEntry as jest.Mock, entries: getCombatEntries as jest.Mock }
const party = [character('c1', 'Elara'), character('c2', 'Bram')]

const baseEntries = (): CombatEntry[] => [
  entry({ id: 'p1', user_id: 'u1', character_id: 'c1', position: 1, is_current: true }),
  entry({ id: 'p2', user_id: 'u2', character_id: 'c2', position: 2 }),
  enemy({ id: 'g1', name: 'Goblin', hp: 0, position: 3 }),
  enemy({ id: 'o1', name: 'Ogre', hidden: true, position: 4 }),
]

let client: QueryClient
/** Stands in for the screen, which owns the entries query that every action refetches. */
function Observer() {
  useCombatEntries(combat(), true)
  return null
}
function ui(entries: CombatEntry[], round = 3) {
  const c = combat({ round })
  const { rows, currentId } = buildGmOrder({ combat: c, entries, party, userId: undefined })
  return (
    <QueryClientProvider client={client}>
      <Observer />
      <InitiativeStrip campaignId="camp1" combatId="cb1" rows={rows} currentId={currentId} round={round} />
    </QueryClientProvider>
  )
}
function setup(entries: CombatEntry[] = baseEntries(), round = 3) {
  client = makeTestQueryClient()
  client.setQueryData(qk.combatEntries('cb1'), entries)
  return render(ui(entries, round))
}

beforeEach(() => {
  jest.clearAllMocks()
  for (const k of ['next', 'set', 'move'] as const) m[k].mockResolvedValue(1)
  m.entries.mockResolvedValue(baseEntries())
})

describe('Next turn', () => {
  test('names the current entry', async () => {
    setup()
    fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
    await waitFor(() => expect(m.next).toHaveBeenCalledWith('cb1', 'p1'))
  })

  test('is disabled with no current entry', () => {
    setup(baseEntries().map((e) => ({ ...e, is_current: false })))
    expect(screen.getByRole('button', { name: 'Next turn' })).toBeDisabled()
  })

  test('a double tap is one call', async () => {
    setup()
    fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
    fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
    await waitFor(() => expect(m.next).toHaveBeenCalledTimes(1))
  })

  test('a stale tap refetches and says nothing', async () => {
    setup()
    m.entries.mockClear()
    fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
    await waitFor(() => expect(m.entries).toHaveBeenCalled())
    expect(showToast).not.toHaveBeenCalled()
  })

  test('an error toasts and refetches', async () => {
    m.next.mockRejectedValue(new AppError('no_active_combat'))
    setup()
    m.entries.mockClear()
    fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.no_active_combat))
    await waitFor(() => expect(m.entries).toHaveBeenCalled())
  })

  test('the busy guard is released after a failure', async () => {
    m.next.mockRejectedValueOnce(new AppError('no_active_combat'))
    setup()
    fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
    await waitFor(() => expect(showToast).toHaveBeenCalled())
    fireEvent.press(screen.getByRole('button', { name: 'Next turn' }))
    await waitFor(() => expect(m.next).toHaveBeenCalledTimes(2))
  })
})

describe('the chips', () => {
  test('everyone is listed in order, the current one marked in text and symbol', () => {
    setup()
    const chips = screen.getAllByTestId(/^chip-/).map((c) => c.props.testID)
    expect(chips).toEqual(['chip-p1', 'chip-p2', 'chip-g1', 'chip-o1'])
    expect(within(screen.getByTestId('chip-p1')).getByText('Current')).toBeTruthy()
    expect(within(screen.getByTestId('chip-p1')).getByText('▶')).toBeTruthy()
    expect(within(screen.getByTestId('chip-p2')).queryByText('Current')).toBeNull()
  })

  test('a downed enemy says Down and a hidden one says Hidden', () => {
    setup()
    expect(within(screen.getByTestId('chip-g1')).getByText('Down')).toBeTruthy()
    expect(within(screen.getByTestId('chip-o1')).getByText('Hidden')).toBeTruthy()
    expect(within(screen.getByTestId('chip-p2')).queryByText('Down')).toBeNull()
  })

  test('tapping a downed enemy makes it current', async () => {
    setup()
    fireEvent.press(screen.getByRole('button', { name: /^Goblin/ }))
    await waitFor(() => expect(m.set).toHaveBeenCalledWith('g1'))
  })

  test('Move later moves one place down, Move earlier one up', async () => {
    setup()
    fireEvent.press(screen.getByRole('button', { name: 'Move later: Elara' }))
    await waitFor(() => expect(m.move).toHaveBeenCalledWith('p1', 2))
    fireEvent.press(screen.getByRole('button', { name: 'Move earlier: Ogre' }))
    await waitFor(() => expect(m.move).toHaveBeenCalledWith('o1', 3))
  })

  test('the ends of the order have no move in that direction', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Move earlier: Elara' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Move later: Ogre' })).toBeNull()
  })

  test('a failed move toasts', async () => {
    m.move.mockRejectedValue(new AppError('network'))
    setup()
    fireEvent.press(screen.getByRole('button', { name: 'Move later: Elara' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.network))
  })
})

describe('the round', () => {
  test('shows the round, announces a change, not the first render', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
    announce.mockClear()
    const { rerender } = setup()
    expect(screen.getByText('Round 3')).toBeTruthy()
    expect(announce).not.toHaveBeenCalled()
    rerender(ui(baseEntries(), 4))
    await waitFor(() => expect(announce).toHaveBeenCalledWith('Round 4'))
  })
})

describe('a big fight', () => {
  test('20 rows are one horizontal scroll container, not a wrapping block, and every chip is present', () => {
    const many = [
      entry({ id: 'p0', user_id: 'u0', character_id: 'c1', position: 1, is_current: true }),
      ...Array.from({ length: 19 }, (_, i) => enemy({ id: `e${i}`, name: `Orc ${i + 1}`, position: i + 2 })),
    ]
    setup(many)
    const scroll = screen.getByTestId('strip-scroll')
    expect(scroll.props.horizontal).toBe(true)
    expect(screen.getAllByTestId('strip-scroll')).toHaveLength(1)
    expect(within(scroll).getAllByTestId(/^chip-/)).toHaveLength(20)
    expect(screen.getByRole('button', { name: 'Next turn' })).toBeTruthy()
    expect(screen.getByText('Round 3')).toBeTruthy()
  })
})
