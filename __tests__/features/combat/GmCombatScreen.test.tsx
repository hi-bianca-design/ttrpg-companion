import 'react-native-gesture-handler/jestSetup'
import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { PortalHost } from '@rn-primitives/portal'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import {
  addEnemies, applyEnemyHp, getCombatEntries, newBatchId, nextTurn, removeEntry, undoEnemyHp, updateEnemy,
  type CombatEntry, type HpMode,
} from '@/features/combat/combat.api'
import { GmCombatScreen } from '@/features/combat/GmCombatScreen'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { character, combat, enemy, entry } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

jest.setTimeout(30000) // a 20-card grid re-renders on every tap, which is slow on a loaded machine

const m = {
  entries: getCombatEntries as jest.Mock, apply: applyEnemyHp as jest.Mock, undo: undoEnemyHp as jest.Mock,
  next: nextTurn as jest.Mock, update: updateEnemy as jest.Mock, remove: removeEntry as jest.Mock, add: addEnemies as jest.Mock,
}
const party = [character('c1', 'Mira'), character('c2', 'Bram')]
const live = combat({ round: 2 })
const campaign = { id: 'camp1', gm_id: 'gm', system_id: 'dnd5e-2024', members: [] } as never

const baseEntries = (): CombatEntry[] => [
  entry({ id: 'p1', user_id: 'u1', character_id: 'c1', position: 1, initiative: 18, is_current: true }),
  entry({ id: 'p2', user_id: 'u2', character_id: 'c2', position: 2, initiative: 15 }),
  ...[1, 2, 3, 4].map((n) => enemy({ id: `g${n}`, name: `Goblin ${n}`, group_id: 'grp', position: 2 + n, initiative: 12 })),
  enemy({ id: 'g5', name: 'Goblin 5', group_id: 'later', position: 7, initiative: 12 }),
  enemy({ id: 'o1', name: 'Ogre', hidden: true, hp: 30, max_hp: 59, ac: 11, position: 8, initiative: 8, xp: 450 }),
]

/**
 * A stand-in for the server's hit point arithmetic (apply_enemy_hp / undo_enemy_hp): temp absorbs damage
 * first, hit points clamp to 0..max, temp keeps the higher value, and a batch can be undone once.
 */
let store: CombatEntry[] = []
const before = new Map<string, CombatEntry[]>()
function fakeServer() {
  let n = 0
  m.entries.mockImplementation(async () => store.map((e) => ({ ...e })))
  m.apply.mockImplementation(async (_c: string, ids: string[], mode: HpMode, amount: number) => {
    const batch = `batch-${++n}`
    before.set(batch, store.map((e) => ({ ...e })))
    store = store.map((e) => {
      if (!ids.includes(e.id)) return e
      const hp = e.hp ?? 0
      const max = e.max_hp ?? hp
      if (mode === 'temp') return { ...e, temp_hp: Math.max(e.temp_hp, amount) }
      if (mode === 'heal') return { ...e, hp: Math.min(max, hp + amount) }
      const absorbed = Math.min(e.temp_hp, amount)
      return { ...e, temp_hp: e.temp_hp - absorbed, hp: Math.max(0, hp - (amount - absorbed)) }
    })
    return batch
  })
  m.undo.mockImplementation(async (_c: string, batch: string) => {
    const snap = before.get(batch)
    if (!snap) return 0
    store = snap
    before.delete(batch)
    return 1
  })
}

let client: QueryClient
function ui(c = live) {
  return (
    <QueryClientProvider client={client}>
      <GmCombatScreen campaign={campaign} combat={c} party={party} />
      <PortalHost />
    </QueryClientProvider>
  )
}
function setup(entries: CombatEntry[] = baseEntries()) {
  store = entries.map((e) => ({ ...e }))
  before.clear()
  fakeServer()
  client = makeTestQueryClient()
  client.setQueryData(qk.combatEntries('cb1'), entries)
  return render(ui())
}
const card = (id: string) => screen.getByTestId(`card-${id}`)
const select = (name: string) => fireEvent.press(screen.getByRole('button', { name: `Select ${name}` }))
const openStatBlock = (id: string) => fireEvent.press(within(card(id)).getByRole('button', { name: /Full stat block/ }))
const hit = (id: string, amount: string, mode = 'Damage') => {
  fireEvent.changeText(within(card(id)).getByLabelText('Amount'), amount)
  fireEvent.press(within(card(id)).getByRole('button', { name: mode }))
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(newBatchId as jest.Mock).mockReturnValue('client-batch')
  for (const k of ['next', 'update', 'remove'] as const) m[k].mockResolvedValue(1)
  m.add.mockResolvedValue(['new'])
})

describe('the grid', () => {
  test('12 enemies with long names render 12 cards, each name on one line', () => {
    const enemies = Array.from({ length: 12 }, (_, i) => enemy({ id: `e${i}`, name: `Hobgoblin Captain of the Iron Legion ${i + 1}`, position: i + 1 }))
    setup(enemies)
    expect(screen.getAllByTestId(/^card-/)).toHaveLength(12)
    for (let i = 0; i < 12; i++) expect(within(card(`e${i}`)).getByText(`Hobgoblin Captain of the Iron Legion ${i + 1}`).props.numberOfLines).toBe(1)
  })

  test('8 players and 12 enemies render without error', () => {
    const players = Array.from({ length: 8 }, (_, i) => entry({ id: `pp${i}`, user_id: `u${i}`, character_id: 'c1', position: i + 1 }))
    const enemies = Array.from({ length: 12 }, (_, i) => enemy({ id: `ee${i}`, name: `Orc ${i + 1}`, position: 9 + i }))
    setup([...players, ...enemies])
    expect(screen.getAllByRole('button', { name: /^Select Orc/ })).toHaveLength(12)
    expect(screen.getAllByTestId(/^player-/)).toHaveLength(8)
  })

  test('every card gets the same fixed width for the column count, and a narrow container lowers the count', () => {
    setup() // the jest window is 750 wide: two columns
    fireEvent(screen.getByTestId('gm-combat'), 'layout', { nativeEvent: { layout: { width: 1000, height: 800 } } })
    for (const c of screen.getAllByTestId(/^card-/)) expect(c).toHaveStyle({ width: 492 })
    fireEvent(screen.getByTestId('gm-combat'), 'layout', { nativeEvent: { layout: { width: 600, height: 800 } } })
    for (const c of screen.getAllByTestId(/^card-/)) expect(c.props.style).toBeUndefined()
  })

  test('players never appear as enemy cards', () => {
    setup()
    const cards = screen.getAllByTestId(/^card-/)
    expect(cards.map((c) => c.props.testID).sort()).toEqual(['card-g1', 'card-g2', 'card-g3', 'card-g4', 'card-g5', 'card-o1'])
    expect(screen.queryByTestId('card-p1')).toBeNull()
    expect(within(screen.getByTestId('player-p1')).getByText('Mira')).toBeTruthy()
  })

  test('player cards show name, hit points as text and conditions, with no edit control of any kind', () => {
    setup()
    for (const id of ['p1', 'p2']) {
      const r = within(screen.getByTestId(`player-${id}`))
      expect(r.queryByLabelText('Amount')).toBeNull()
      for (const name of [/Damage/, /Heal/, /Temp HP/, /^Select/, /^Set HP/, /^Remove/, /^Reveal/, /^Hide/, /^Add another/]) {
        expect(r.queryByRole('button', { name })).toBeNull()
      }
    }
    expect(within(screen.getByTestId('player-p1')).getByText('22/30')).toBeTruthy()
  })

  test('no initiative number is shown anywhere', () => {
    setup()
    expect(screen.queryByText(/init/i)).toBeNull()
    expect(screen.queryByLabelText(/initiative/i)).toBeNull()
  })

  test('with no enemies it shows the empty state and Add enemy opens the add form', () => {
    setup([baseEntries()[0], baseEntries()[1]])
    expect(screen.queryAllByTestId(/^card-/)).toHaveLength(0)
    expect(screen.getByText('No enemies yet')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Add enemy' }))
    expect(screen.getByLabelText('Max HP')).toBeTruthy()
  })

  test('the current enemy card is marked in text and symbol', () => {
    setup(baseEntries().map((e) => ({ ...e, is_current: e.id === 'g2' })))
    expect(within(card('g2')).getByText('Current')).toBeTruthy()
    expect(within(card('g1')).queryByText('Current')).toBeNull()
  })
})

describe('XP', () => {
  test('the header counts the XP of enemies that are down', async () => {
    setup([
      enemy({ id: 'a', name: 'Goblin Boss', xp: 200, position: 1 }),
      enemy({ id: 'b', name: 'Wolf', xp: 50, position: 2 }),
      enemy({ id: 'c', name: 'Bugbear', xp: 200, position: 3 }),
    ])
    expect(screen.getByText('XP earned: 0')).toBeTruthy()
    await waitFor(() => expect(client.isFetching()).toBe(0)) // let the mount refetch land first
    store = store.map((e) => (e.id === 'c' ? e : { ...e, hp: 0 }))
    act(() => {
      client.setQueryData(qk.combatEntries('cb1'), store)
    })
    expect(await screen.findByText('XP earned: 250')).toBeTruthy()
  })

  test('the header has no XP total when no enemy carries XP', () => {
    setup([enemy({ id: 'a', name: 'Goblin', xp: null, hp: 0, position: 1 }), enemy({ id: 'b', name: 'Wolf', xp: null, position: 2 })])
    expect(screen.queryByText(/XP earned/)).toBeNull()
  })

  test('healing a downed enemy takes its XP back out', async () => {
    setup([enemy({ id: 'a', name: 'Goblin Boss', xp: 200, hp: 0, max_hp: 21, position: 1 })])
    expect(screen.getByText('XP earned: 200')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Show Goblin Boss' }))
    hit('a', '5', 'Heal')
    expect(await screen.findByText('XP earned: 0')).toBeTruthy()
  })
})

describe('hit points through the card (server arithmetic stubbed)', () => {
  const goblin = () => [enemy({ id: 'g1', name: 'Goblin 1', hp: 22, max_hp: 30, position: 1 })]

  test('22/30 minus 7 is 15/30', async () => {
    setup(goblin())
    hit('g1', '7')
    await waitFor(() => expect(within(card('g1')).getByText('15/30')).toBeTruthy())
    expect(m.apply).toHaveBeenCalledWith('cb1', ['g1'], 'damage', 7, 'client-batch')
  })

  test('then 20 more clamps to 0/30, which collapses the card to Down', async () => {
    setup(goblin())
    hit('g1', '7')
    await waitFor(() => expect(within(card('g1')).getByText('15/30')).toBeTruthy())
    hit('g1', '20')
    await waitFor(() => expect(within(card('g1')).getByText('Down')).toBeTruthy())
    expect(within(card('g1')).queryByLabelText('Amount')).toBeNull()
    fireEvent.press(screen.getByRole('button', { name: 'Show Goblin 1' }))
    expect(within(card('g1')).getByText('0/30')).toBeTruthy()
  })

  test('temp hit points absorb damage first', async () => {
    setup([enemy({ id: 'g1', name: 'Goblin 1', hp: 22, max_hp: 30, temp_hp: 5, position: 1 })])
    expect(within(card('g1')).getByText('+5 Temp HP')).toBeTruthy()
    hit('g1', '7')
    await waitFor(() => expect(within(card('g1')).getByText('20/30')).toBeTruthy())
    expect(within(card('g1')).queryByText(/^\+\d+ Temp HP$/)).toBeNull()
  })

  test('Undo restores the last change', async () => {
    setup(goblin())
    hit('g1', '7')
    await waitFor(() => expect(within(card('g1')).getByText('15/30')).toBeTruthy())
    fireEvent.press(within(card('g1')).getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(within(card('g1')).getByText('22/30')).toBeTruthy())
    expect(m.undo).toHaveBeenCalledWith('cb1', 'batch-1')
  })

  test('Undo on a downed card brings it back', async () => {
    setup(goblin())
    hit('g1', '22')
    await waitFor(() => expect(within(card('g1')).getByText('Down')).toBeTruthy())
    fireEvent.press(within(card('g1')).getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(within(card('g1')).getByText('22/30')).toBeTruthy())
  })
})

describe('bulk damage', () => {
  test('selecting four goblins and entering 5 applies once to the four ids, then the selection is gone', async () => {
    setup()
    for (const n of [1, 2, 3, 4]) select(`Goblin ${n}`)
    expect(screen.getByText('4 selected')).toBeTruthy()
    const bulk = within(screen.getByTestId('bulk-bar'))
    fireEvent.changeText(bulk.getByLabelText('Amount'), '5')
    fireEvent.press(bulk.getByRole('button', { name: 'Damage' }))
    await waitFor(() => expect(screen.queryByText('4 selected')).toBeNull(), { timeout: 15000 })
    expect(m.apply).toHaveBeenCalledTimes(1)
    expect(m.apply).toHaveBeenCalledWith('cb1', ['g1', 'g2', 'g3', 'g4'], 'damage', 5, 'client-batch')
    await waitFor(() => expect(within(card('g1')).getByText('2/7')).toBeTruthy())
  })

  test('bulk Heal and Temp HP pass their modes', async () => {
    setup()
    select('Goblin 1')
    fireEvent.changeText(within(screen.getByTestId('bulk-bar')).getByLabelText('Amount'), '2')
    fireEvent.press(within(screen.getByTestId('bulk-bar')).getByRole('button', { name: 'Heal' }))
    await waitFor(() => expect(m.apply).toHaveBeenCalledWith('cb1', ['g1'], 'heal', 2, 'client-batch'))
    select('Goblin 2')
    fireEvent.changeText(within(screen.getByTestId('bulk-bar')).getByLabelText('Amount'), '3')
    fireEvent.press(within(screen.getByTestId('bulk-bar')).getByRole('button', { name: 'Temp HP' }))
    await waitFor(() => expect(m.apply).toHaveBeenCalledWith('cb1', ['g2'], 'temp', 3, 'client-batch'))
  })

  test('after a bulk hit every affected card has Undo, and one tap undoes the batch once', async () => {
    setup()
    for (const n of [1, 2]) select(`Goblin ${n}`)
    fireEvent.changeText(within(screen.getByTestId('bulk-bar')).getByLabelText('Amount'), '5')
    fireEvent.press(within(screen.getByTestId('bulk-bar')).getByRole('button', { name: 'Damage' }))
    await waitFor(() => expect(within(card('g1')).getByRole('button', { name: 'Undo' })).toBeTruthy())
    expect(within(card('g2')).getByRole('button', { name: 'Undo' })).toBeTruthy()
    expect(within(card('g3')).queryByRole('button', { name: 'Undo' })).toBeNull()
    fireEvent.press(within(card('g2')).getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(m.undo).toHaveBeenCalledTimes(1))
    expect(m.undo).toHaveBeenCalledWith('cb1', 'batch-1')
    await waitFor(() => expect(within(card('g1')).queryByRole('button', { name: 'Undo' })).toBeNull())
  })

  test('Select group selects exactly the group, not the goblin added later', () => {
    setup()
    openStatBlock('g1')
    fireEvent.press(screen.getByRole('button', { name: 'Select group' }))
    expect(screen.getByText('4 selected')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Select Goblin 4' })).toHaveAccessibilityState({ selected: true })
    expect(screen.getByRole('button', { name: 'Select Goblin 5' })).toHaveAccessibilityState({ selected: false })
  })

  test('a lone enemy has no Select group', () => {
    setup()
    openStatBlock('o1')
    expect(screen.queryByRole('button', { name: 'Select group' })).toBeNull()
  })
})

describe('card actions', () => {
  test('a hidden enemy shows Hidden; Reveal sends hidden false', async () => {
    setup()
    expect(within(card('o1')).getByText('Hidden')).toBeTruthy()
    openStatBlock('o1')
    fireEvent.press(screen.getByRole('button', { name: 'Reveal' }))
    await waitFor(() => expect(m.update).toHaveBeenCalledWith('o1', { hidden: false }))
  })

  test('Set HP sends a typed exact value for that enemy', async () => {
    setup()
    openStatBlock('g5')
    fireEvent.changeText(screen.getByLabelText('Set HP to'), '3')
    fireEvent.press(screen.getByRole('button', { name: 'Set HP' }))
    await waitFor(() => expect(m.update).toHaveBeenCalledWith('g5', { hp: 3 }))
  })

  test('a condition picked on a card is saved on that enemy', async () => {
    setup()
    fireEvent.press(screen.getByRole('button', { name: 'Conditions: Ogre' }))
    fireEvent.press(screen.getByRole('button', { name: 'Prone' }))
    fireEvent.press(screen.getByRole('button', { name: 'Apply (1)' }))
    await waitFor(() => expect(m.update).toHaveBeenCalledWith('o1', { conditions: ['prone'] }))
  })

  test('Remove needs the confirm and then removes that entry', async () => {
    setup()
    openStatBlock('g5')
    fireEvent.press(screen.getByRole('button', { name: 'Remove' }))
    expect(m.remove).not.toHaveBeenCalled()
    fireEvent.press(screen.getByRole('button', { name: 'Remove Goblin 5' }))
    await waitFor(() => expect(m.remove).toHaveBeenCalledWith('g5'))
  })

  test('+1 adds one more of that enemy at full health with its stats', async () => {
    const boss = enemy({
      id: 'b1', name: 'Goblin Boss 2', hp: 4, max_hp: 21, ac: 17, defense_label: null, xp: 200, notes: 'shield', hidden: true,
      attacks: [{ name: 'Scimitar', toHit: '+4', damage: '1d6+2' }], position: 1,
    })
    setup([boss])
    fireEvent.press(screen.getByRole('button', { name: 'Add another Goblin Boss 2' }))
    await waitFor(() => expect(m.add).toHaveBeenCalledTimes(1))
    expect(m.add).toHaveBeenCalledWith('cb1', {
      name: 'Goblin Boss', count: 1, maxHp: 21, initiative: null, ac: 17, notes: 'shield', hidden: true,
      defenseLabel: null, attacks: [{ name: 'Scimitar', toHit: '+4', damage: '1d6+2' }], xp: 200,
    })
  })

  test('a failed +1 shows the error', async () => {
    m.add.mockRejectedValue(new AppError('network'))
    setup()
    fireEvent.press(screen.getByRole('button', { name: 'Add another Ogre' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.network))
  })
})

describe('turns', () => {
  test('the initiative strip is mounted with the round and every row of the order', () => {
    setup()
    expect(screen.getByText('Round 2')).toBeTruthy()
    expect(screen.getAllByTestId(/^chip-/)).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Next turn' })).toBeTruthy()
  })
})
