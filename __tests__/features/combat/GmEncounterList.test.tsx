import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { showToast } from '@/components/ui/toast'
import { GmEncounterList } from '@/features/combat/GmEncounterList'
import { deleteEncounter, type Encounter } from '@/features/encounters/encounters.api'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../../helpers/queryClient'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/encounters/encounters.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const mockDelete = deleteEncounter as jest.Mock
const ambush = {
  id: 'e1', campaign_id: 'camp1', name: 'Goblin Ambush', story_before: null, story_why: null, story_after: null, created_at: '', updated_at: '',
  enemies: [{ id: 'x1', encounter_id: 'e1', campaign_id: 'camp1', name: 'Goblin', count: 2, max_hp: 7, defense_label: null, ac: null, attacks: [], xp: null, notes: null, hidden: false, position: 1 }],
} as unknown as Encounter

function setup(onPick = jest.fn()) {
  const client = makeTestQueryClient()
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <GmEncounterList campaignId="camp1" encounters={[ambush]} onPick={onPick} />
      <PortalHost />
    </QueryClientProvider>,
  )
  return { onPick, invalidate }
}
beforeEach(() => { jest.clearAllMocks(); mockDelete.mockResolvedValue(undefined) })

test('New encounter opens an empty form', () => {
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'New encounter' }))
  expect(screen.getByText('Give the encounter a name')).toBeTruthy()
  expect(screen.getByLabelText('Encounter name').props.value).toBe('')
})

test('Edit opens the form prefilled', () => {
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'Edit Goblin Ambush' }))
  expect(screen.getByText('Edit encounter')).toBeTruthy()
  expect(screen.getByLabelText('Encounter name').props.value).toBe('Goblin Ambush')
  expect(screen.getByLabelText('Enemy 1 name').props.value).toBe('Goblin')
})

test('Delete asks first; Cancel deletes nothing', () => {
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'Delete Goblin Ambush' }))
  expect(screen.getByText('Delete Goblin Ambush?')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
  expect(mockDelete).not.toHaveBeenCalled()
  expect(screen.queryByText('Delete Goblin Ambush?')).toBeNull()
})

test('confirming deletes the encounter and refreshes the list', async () => {
  const { invalidate } = setup()
  fireEvent.press(screen.getByRole('button', { name: 'Delete Goblin Ambush' }))
  fireEvent.press(screen.getByRole('button', { name: 'Delete encounter' }))
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('e1'))
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.encounters('camp1') }))
  await waitFor(() => expect(screen.queryByText('Delete Goblin Ambush?')).toBeNull())
})

test('a failed delete shows the error and leaves the dialog open', async () => {
  mockDelete.mockRejectedValue(new AppError('not_allowed'))
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'Delete Goblin Ambush' }))
  fireEvent.press(screen.getByRole('button', { name: 'Delete encounter' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.not_allowed))
  expect(screen.getByText('Delete Goblin Ambush?')).toBeTruthy()
})

test('picking still reports the id', () => {
  const { onPick } = setup()
  fireEvent.press(screen.getByRole('button', { name: 'Goblin Ambush' }))
  expect(onPick).toHaveBeenCalledWith('e1')
})
