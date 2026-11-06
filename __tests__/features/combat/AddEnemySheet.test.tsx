import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider } from '@tanstack/react-query'
import { PortalHost } from '@rn-primitives/portal'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { addEncounterEnemies, addEnemies } from '@/features/combat/combat.api'
import { AddEnemySheet } from '@/features/combat/AddEnemySheet'
import type { GmEnemyRow } from '@/features/combat/battleOrder'
import type { Encounter } from '@/features/encounters/encounters.api'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../../helpers/queryClient'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const mockAdd = addEnemies as jest.Mock
const mockAddEncounter = addEncounterEnemies as jest.Mock

function row(over: Partial<GmEnemyRow> & { id: string; name: string }): GmEnemyRow {
  return {
    kind: 'enemy', initiative: null, hp: 5, maxHp: 21, tempHp: 0, ac: 17, notes: null, defenseLabel: null, attacks: [], xp: null,
    conditions: [], hidden: false, groupId: null, isDown: false, isCurrent: false, ...over,
  }
}
const boss = row({
  id: 'b1', name: 'Goblin Boss 2', ac: 17, notes: 'shield', xp: 200, hidden: true, defenseLabel: 'Shield up',
  attacks: [{ name: 'Scimitar', toHit: '+4', damage: '1d6+2' }],
})
const wolves = [row({ id: 'w1', name: 'Wolf 1', maxHp: 11 }), row({ id: 'w2', name: 'Wolf 2', maxHp: 11 })]
const ambush = { id: 'e1', name: 'Goblin Ambush', enemies: [{ count: 2 }, { count: 1 }] } as unknown as Encounter

function setup(enemies: GmEnemyRow[] = []) {
  const client = makeTestQueryClient()
  client.setQueryData(qk.encounters('camp1'), [ambush])
  render(
    <QueryClientProvider client={client}>
      <AddEnemySheet campaignId="camp1" combatId="cb1" enemies={enemies} open onOpenChange={jest.fn()} />
      <PortalHost />
    </QueryClientProvider>,
  )
}
const set = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text)
const value = (label: string) => screen.getByLabelText(label).props.value
const tab = (name: string) => fireEvent.press(screen.getByRole('tab', { name }))
const submit = () => fireEvent.press(screen.getByRole('button', { name: 'Add enemy' }))

beforeEach(() => {
  jest.clearAllMocks()
  mockAdd.mockResolvedValue(['id1'])
  mockAddEncounter.mockResolvedValue(['id1'])
})

describe('blank', () => {
  test('a name and max HP add one enemy with no initiative', async () => {
    setup()
    set('Name', 'Bandit')
    set('Max HP', '11')
    submit()
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1))
    expect(mockAdd).toHaveBeenCalledWith('cb1', { name: 'Bandit', count: 1, maxHp: 11, initiative: null, ac: null, notes: null, hidden: false })
  })

  test('submit is disabled until the name and max HP are both valid', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Add enemy' })).toBeDisabled()
    set('Name', 'Bandit')
    expect(screen.getByRole('button', { name: 'Add enemy' })).toBeDisabled()
    set('Max HP', '0')
    expect(screen.getByRole('button', { name: 'Add enemy' })).toBeDisabled()
    set('Max HP', '11')
    expect(screen.getByRole('button', { name: 'Add enemy' })).toBeEnabled()
    set('Name', '   ')
    expect(screen.getByRole('button', { name: 'Add enemy' })).toBeDisabled()
  })

  test('there are no initiative inputs', () => {
    setup()
    expect(screen.queryByLabelText(/initiative/i)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Separate rolls' })).toBeNull()
  })

  test('count is clamped to 1..20 and sent', async () => {
    setup()
    set('Count', '100')
    expect(value('Count')).toBe('20')
    set('Count', '0')
    expect(value('Count')).toBe('1')
    set('Name', 'Goblin')
    set('Max HP', '7')
    set('Count', '3')
    expect(screen.getByRole('button', { name: 'Add 3 enemies' })).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Add 3 enemies' }))
    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith('cb1', expect.objectContaining({ count: 3, initiative: null })))
  })

  test('letters are stripped from the number fields and the name is cut at 60', () => {
    setup()
    for (const label of ['Max HP', 'AC', 'Count']) {
      set(label, '1a.2')
      expect(value(label)).toBe('12')
    }
    set('Name', 'x'.repeat(61))
    expect(value('Name')).toHaveLength(60)
    expect(screen.getByLabelText('Max HP').props.maxLength).toBe(4)
    expect(screen.getByLabelText('AC').props.maxLength).toBe(2)
  })

  test('Hidden, AC and trimmed notes are sent', async () => {
    setup()
    set('Name', 'Ogre')
    set('Max HP', '59')
    set('AC', '11')
    set('Notes', '  weak to fire ')
    fireEvent.press(screen.getByRole('button', { name: 'Hidden' }))
    submit()
    await waitFor(() => expect(mockAdd).toHaveBeenCalled())
    expect(mockAdd).toHaveBeenCalledWith('cb1', { name: 'Ogre', count: 1, maxHp: 59, initiative: null, ac: 11, notes: 'weak to fire', hidden: true })
  })

  test('after a successful add the sheet stays open and the fields reset', async () => {
    setup()
    set('Name', 'Goblin')
    set('Max HP', '7')
    set('Count', '3')
    fireEvent.press(screen.getByRole('button', { name: 'Add 3 enemies' }))
    await waitFor(() => expect(value('Name')).toBe(''))
    expect(value('Max HP')).toBe('')
    expect(value('Count')).toBe('1')
    expect(screen.getByLabelText('Name')).toBeTruthy()
  })

  test('a failed add toasts the error and keeps what was typed', async () => {
    mockAdd.mockRejectedValue(new AppError('invalid_enemy'))
    setup()
    set('Name', 'Goblin')
    set('Max HP', '7')
    submit()
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.invalid_enemy))
    expect(value('Name')).toBe('Goblin')
    expect(value('Max HP')).toBe('7')
  })

  test('the button is disabled while the request is in flight, so a double tap is one call', async () => {
    let release: (ids: string[]) => void = () => {}
    mockAdd.mockReturnValue(new Promise<string[]>((r) => { release = r }))
    setup()
    set('Name', 'Goblin')
    set('Max HP', '7')
    submit()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add enemy' })).toBeDisabled())
    submit()
    expect(mockAdd).toHaveBeenCalledTimes(1)
    await act(async () => { release(['id1']) })
  })
})

describe('copy', () => {
  test('lists one entry per name stem and opens on Copy when enemies exist', () => {
    setup([boss, ...wolves])
    expect(screen.getByRole('button', { name: 'Copy Goblin Boss' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Copy Wolf' })).toHaveLength(1)
  })

  test('picking an enemy adds one more with its stats and no initiative', async () => {
    setup([boss])
    fireEvent.press(screen.getByRole('button', { name: 'Copy Goblin Boss' }))
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1))
    expect(mockAdd).toHaveBeenCalledWith('cb1', {
      name: 'Goblin Boss', count: 1, maxHp: 21, initiative: null, ac: 17, notes: 'shield', hidden: true,
      defenseLabel: 'Shield up', attacks: [{ name: 'Scimitar', toHit: '+4', damage: '1d6+2' }], xp: 200,
    })
  })

  test('a failed copy toasts the error', async () => {
    mockAdd.mockRejectedValue(new AppError('network'))
    setup([boss])
    fireEvent.press(screen.getByRole('button', { name: 'Copy Goblin Boss' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.network))
  })

  test('with no enemies the sheet opens on Blank and Copy says so', () => {
    setup()
    expect(screen.getByLabelText('Name')).toBeTruthy()
    tab('Copy')
    expect(screen.getByText('No enemies in the fight yet')).toBeTruthy()
  })
})

describe('encounter', () => {
  test('picking a saved encounter adds its enemies', async () => {
    setup()
    tab('Encounter')
    fireEvent.press(screen.getByRole('button', { name: 'Goblin Ambush' }))
    await waitFor(() => expect(mockAddEncounter).toHaveBeenCalledWith('cb1', 'e1'))
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('a failed encounter add toasts the error', async () => {
    mockAddEncounter.mockRejectedValue(new AppError('network'))
    setup()
    tab('Encounter')
    fireEvent.press(screen.getByRole('button', { name: 'Goblin Ambush' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.network))
  })
})
