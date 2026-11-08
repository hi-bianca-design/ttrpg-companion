import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { showToast } from '@/components/ui/toast'
import { EncounterFormSheet } from '@/features/encounters/EncounterFormSheet'
import { saveEncounter, type Encounter } from '@/features/encounters/encounters.api'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../../helpers/queryClient'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/encounters/encounters.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const mockSave = saveEncounter as jest.Mock

function setup(encounter?: Encounter, onOpenChange = jest.fn()) {
  const client = makeTestQueryClient()
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <EncounterFormSheet campaignId="camp1" encounter={encounter} open onOpenChange={onOpenChange} />
      <PortalHost />
    </QueryClientProvider>,
  )
  return { onOpenChange, invalidate }
}
const set = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text)
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }))
const save = () => screen.getByRole('button', { name: /^(Create encounter|Save changes)$/ })

beforeEach(() => {
  jest.clearAllMocks()
  mockSave.mockResolvedValue('enc1')
})

describe('new encounter', () => {
  test('is titled New encounter and Save is disabled until the name is valid, with a reason', () => {
    setup()
    expect(screen.getByText('New encounter')).toBeTruthy()
    expect(save()).toBeDisabled()
    expect(screen.getByText('Give the encounter a name')).toBeTruthy()
    set('Encounter name', 'Wolf ambush')
    expect(save()).toBeEnabled()
    expect(screen.queryByText('Give the encounter a name')).toBeNull()
    set('Encounter name', '   ')
    expect(save()).toBeDisabled()
  })

  test('has the three story notes with their labels', () => {
    setup()
    for (const l of ['How the party got here', 'Why this fight exists', 'What happens after']) expect(screen.getByLabelText(l)).toBeTruthy()
  })

  test('saves the name and notes, closes, and refreshes the list', async () => {
    const { onOpenChange, invalidate } = setup()
    set('Encounter name', 'Wolf ambush')
    set('How the party got here', 'Along the road')
    press('Create encounter')
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1))
    expect(mockSave).toHaveBeenCalledWith('camp1', { name: 'Wolf ambush', storyBefore: 'Along the road', storyWhy: null, storyAfter: null, enemies: [] }, undefined)
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.encounters('camp1') })
  })

  test('an enemy row needs a name and max HP before Save is enabled, and each gap shows a reason', () => {
    setup()
    set('Encounter name', 'Wolf ambush')
    press('Add enemy')
    expect(save()).toBeDisabled()
    expect(screen.getByText('Give the enemy a name')).toBeTruthy()
    expect(screen.getByText('At least 1')).toBeTruthy()
    set('Enemy 1 name', 'Wolf')
    expect(save()).toBeDisabled()
    set('Enemy 1 max HP', '11')
    expect(save()).toBeEnabled()
  })

  test('saves the enemy with every field, in list order, count clamped', async () => {
    setup()
    set('Encounter name', 'Wolf ambush')
    press('Add enemy')
    set('Enemy 1 name', 'Wolf')
    set('Enemy 1 count', '45')
    expect(screen.getByLabelText('Enemy 1 count').props.value).toBe('20')
    set('Enemy 1 count', '3')
    set('Enemy 1 max HP', '11')
    set('Enemy 1 defense value', '13')
    set('Enemy 1 xp', '50')
    set('Enemy 1 notes', 'pack tactics')
    fireEvent.press(screen.getByRole('button', { name: 'Enemy 1 hidden' }))
    press('Add attack to enemy 1')
    set('Enemy 1 attack 1 name', 'Bite')
    set('Enemy 1 attack 1 to hit', '+4')
    set('Enemy 1 attack 1 damage', '2d4+2')
    press('Add enemy')
    set('Enemy 2 name', 'Alpha')
    set('Enemy 2 max HP', '30')
    press('Create encounter')
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1))
    const [, input] = mockSave.mock.calls[0]
    expect(input.enemies).toEqual([
      { name: 'Wolf', count: 3, max_hp: 11, defense_label: 'AC', ac: 13, xp: 50, notes: 'pack tactics', hidden: true, attacks: [{ name: 'Bite', toHit: '+4', damage: '2d4+2' }] },
      { name: 'Alpha', count: 1, max_hp: 30, defense_label: null, ac: null, xp: null, notes: null, hidden: false, attacks: [] },
    ])
  })

  test('the defense label defaults to AC and can be changed', async () => {
    setup()
    set('Encounter name', 'E')
    press('Add enemy')
    expect(screen.getByLabelText('Enemy 1 defense label').props.value).toBe('AC')
    set('Enemy 1 name', 'Knight')
    set('Enemy 1 max HP', '30')
    set('Enemy 1 defense label', 'Shield')
    set('Enemy 1 defense value', '17')
    press('Create encounter')
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(mockSave.mock.calls[0][1].enemies[0]).toMatchObject({ defense_label: 'Shield', ac: 17 })
  })

  test('move up, move down and remove reorder the rows', async () => {
    setup()
    set('Encounter name', 'E')
    for (const [i, n] of ['A', 'B', 'C'].entries()) {
      press('Add enemy')
      set(`Enemy ${i + 1} name`, n)
      set(`Enemy ${i + 1} max HP`, '5')
    }
    expect(screen.getByRole('button', { name: 'Move enemy 1 up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move enemy 3 down' })).toBeDisabled()
    press('Move enemy 3 up') // A C B
    press('Move enemy 1 down') // C A B
    expect(screen.getByLabelText('Enemy 1 name').props.value).toBe('C')
    press('Remove enemy 2') // C B
    press('Create encounter')
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(mockSave.mock.calls[0][1].enemies.map((e: { name: string }) => e.name)).toEqual(['C', 'B'])
  })

  test('an attack needs a name, and at most six can be added', () => {
    setup()
    set('Encounter name', 'E')
    press('Add enemy')
    set('Enemy 1 name', 'Dragon')
    set('Enemy 1 max HP', '200')
    press('Add attack to enemy 1')
    expect(save()).toBeDisabled()
    expect(screen.getByText('Give the attack a name')).toBeTruthy()
    set('Enemy 1 attack 1 name', 'Bite')
    expect(save()).toBeEnabled()
    for (let i = 0; i < 5; i++) press('Add attack to enemy 1')
    expect(screen.getByRole('button', { name: 'Add attack to enemy 1' })).toBeDisabled()
    press('Remove enemy 1 attack 6')
    expect(screen.getByRole('button', { name: 'Add attack to enemy 1' })).toBeEnabled()
  })

  test('a failed save keeps the form and what was typed, and shows the error', async () => {
    mockSave.mockRejectedValue(new AppError('invalid_encounter'))
    const { onOpenChange } = setup()
    set('Encounter name', 'Wolf ambush')
    press('Create encounter')
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.invalid_encounter))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Encounter name').props.value).toBe('Wolf ambush')
    expect(save()).toBeEnabled()
  })

  test('a double tap saves once', async () => {
    let resolve!: (v: string) => void
    mockSave.mockReturnValue(new Promise((r) => { resolve = r }))
    const { onOpenChange } = setup()
    set('Encounter name', 'E')
    const b = save()
    fireEvent.press(b)
    fireEvent.press(b)
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1))
    resolve('enc1')
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(mockSave).toHaveBeenCalledTimes(1)
  })
})

describe('edit encounter', () => {
  const enc = {
    id: 'e1', campaign_id: 'camp1', name: 'Ambush', story_before: 'b', story_why: null, story_after: 'a', created_at: '', updated_at: '',
    enemies: [
      { id: 'x1', encounter_id: 'e1', campaign_id: 'camp1', name: 'Wolf', count: 3, max_hp: 11, defense_label: 'AC', ac: 13, attacks: [{ name: 'Bite', toHit: '+4', damage: '2d4' }], xp: 50, notes: 'pack', hidden: true, position: 1 },
    ],
  } as unknown as Encounter

  test('is prefilled and saves with the encounter id', async () => {
    setup(enc)
    expect(screen.getByText('Edit encounter')).toBeTruthy()
    expect(screen.getByLabelText('Encounter name').props.value).toBe('Ambush')
    expect(screen.getByLabelText('How the party got here').props.value).toBe('b')
    expect(screen.getByLabelText('Why this fight exists').props.value).toBe('')
    expect(screen.getByLabelText('Enemy 1 name').props.value).toBe('Wolf')
    expect(screen.getByLabelText('Enemy 1 count').props.value).toBe('3')
    expect(screen.getByLabelText('Enemy 1 attack 1 name').props.value).toBe('Bite')
    expect(screen.getByRole('button', { name: 'Enemy 1 hidden' })).toHaveAccessibilityState({ selected: true })
    set('Encounter name', 'Ambush II')
    press('Save changes')
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1))
    const [campaignId, input, encounterId] = mockSave.mock.calls[0]
    expect([campaignId, encounterId, input.name]).toEqual(['camp1', 'e1', 'Ambush II'])
    expect(input.enemies[0]).toMatchObject({ name: 'Wolf', count: 3, max_hp: 11, ac: 13, xp: 50, hidden: true })
  })
})
