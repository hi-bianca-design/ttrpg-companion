import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider } from '@tanstack/react-query'
import { PortalHost } from '@rn-primitives/portal'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { addEnemies, setInitiative } from '@/features/combat/combat.api'
import { AddEnemyForm } from '@/features/combat/AddEnemyForm'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { makeTestQueryClient } from '../../helpers/queryClient'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const mockAdd = addEnemies as jest.Mock
const mockInit = setInitiative as jest.Mock

function setup() {
  const client = makeTestQueryClient()
  render(
    <QueryClientProvider client={client}>
      <AddEnemyForm campaignId="camp1" combatId="cb1" open onOpenChange={jest.fn()} />
      <PortalHost />
    </QueryClientProvider>,
  )
}
const set = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text)
const value = (label: string) => screen.getByLabelText(label).props.value
const submit = (name = /^Add/) => fireEvent.press(screen.getByRole('button', { name }))

function fillGoblins(count = '3') {
  set('Name', 'Goblin')
  set('Max HP', '7')
  set('Count', count)
  set('AC', '13')
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAdd.mockResolvedValue(['id1', 'id2', 'id3'])
  mockInit.mockResolvedValue({})
})

test('a valid ×3 add with a shared initiative is one addEnemies call', async () => {
  setup()
  fillGoblins()
  set('Initiative', '15')
  expect(screen.getByRole('button', { name: 'Add 3 enemies' })).toBeTruthy()
  submit()
  await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1))
  expect(mockAdd).toHaveBeenCalledWith('cb1', { name: 'Goblin', count: 3, maxHp: 7, initiative: 15, ac: 13, notes: null, hidden: false })
  expect(mockInit).not.toHaveBeenCalled()
})

test('separate rolls adds with no initiative then sets only the filled ones', async () => {
  setup()
  fillGoblins()
  fireEvent.press(screen.getByRole('button', { name: 'Separate rolls' }))
  expect(screen.queryByLabelText('Initiative')).toBeNull()
  set('Goblin 1', '15')
  set('Goblin 2', '9')
  submit()
  await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(2))
  expect(mockAdd).toHaveBeenCalledWith('cb1', expect.objectContaining({ count: 3, initiative: null }))
  expect(mockInit).toHaveBeenCalledWith('id1', 15)
  expect(mockInit).toHaveBeenCalledWith('id2', 9)
})

test('Separate rolls only appears for more than one copy', () => {
  setup()
  expect(screen.queryByRole('button', { name: 'Separate rolls' })).toBeNull()
  set('Count', '2')
  expect(screen.getByRole('button', { name: 'Separate rolls' })).toBeTruthy()
})

test('a blank name shows an inline message and makes no call', () => {
  setup()
  set('Max HP', '7')
  submit()
  expect(screen.getByText('Enter a name')).toBeTruthy()
  expect(mockAdd).not.toHaveBeenCalled()
})

test.each(['', '0'])('Max HP of "%s" shows an inline message and makes no call', (hp) => {
  setup()
  set('Name', 'Goblin')
  set('Max HP', hp)
  submit()
  expect(screen.getByText('Max HP must be at least 1')).toBeTruthy()
  expect(mockAdd).not.toHaveBeenCalled()
})

test('count 100 becomes 20 and 0 becomes 1', () => {
  setup()
  set('Count', '100')
  expect(value('Count')).toBe('20')
  set('Count', '0')
  expect(value('Count')).toBe('1')
})

test('letters and a decimal point are stripped from every number field', () => {
  setup()
  for (const label of ['Max HP', 'Initiative', 'AC', 'Count']) {
    set(label, '1a.2')
    expect(value(label)).toBe('12')
  }
})

test('a 61-character name is cut at 60', () => {
  setup()
  set('Name', 'x'.repeat(61))
  expect(value('Name')).toHaveLength(60)
})

test('Hidden is sent as true', async () => {
  setup()
  set('Name', 'Ogre')
  set('Max HP', '59')
  fireEvent.press(screen.getByRole('button', { name: 'Hidden' }))
  submit()
  await waitFor(() => expect(mockAdd).toHaveBeenCalled())
  expect(mockAdd).toHaveBeenCalledWith('cb1', expect.objectContaining({ name: 'Ogre', count: 1, hidden: true, initiative: null }))
  expect(screen.queryByText('Add 1 enemies')).toBeNull()
})

test('notes are trimmed and sent', async () => {
  setup()
  set('Name', 'Ogre')
  set('Max HP', '59')
  set('Notes', '  weak to fire ')
  submit()
  await waitFor(() => expect(mockAdd).toHaveBeenCalled())
  expect(mockAdd).toHaveBeenCalledWith('cb1', expect.objectContaining({ notes: 'weak to fire' }))
})

test('a server error toasts and keeps what was typed', async () => {
  mockAdd.mockRejectedValue(new AppError('invalid_enemy'))
  setup()
  fillGoblins()
  submit()
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.invalid_enemy))
  expect(value('Name')).toBe('Goblin')
  expect(value('Max HP')).toBe('7')
})

test('after a successful add the fields are cleared for the next enemy', async () => {
  setup()
  fillGoblins()
  submit()
  await waitFor(() => expect(value('Name')).toBe(''))
  expect(value('Max HP')).toBe('')
  expect(value('Count')).toBe('1')
})

test('the submit button is disabled while the request is in flight, so a double tap is one call', async () => {
  let release: (ids: string[]) => void = () => {}
  mockAdd.mockReturnValue(new Promise<string[]>((r) => { release = r }))
  setup()
  fillGoblins('1')
  submit()
  await waitFor(() => expect(screen.getByRole('button', { name: /^Add/ })).toBeDisabled())
  submit()
  expect(mockAdd).toHaveBeenCalledTimes(1)
  await act(async () => { release(['id1']) })
})

test('initiative is held to -20..99 before anything is sent', async () => {
  setup()
  fillGoblins('1')
  set('Initiative', '150')
  submit()
  await waitFor(() => expect(mockAdd).toHaveBeenCalled())
  expect(mockAdd).toHaveBeenCalledWith('cb1', expect.objectContaining({ initiative: 99 }))
})

test('Max HP and AC are capped at four and two digits', () => {
  setup()
  expect(screen.getByLabelText('Max HP').props.maxLength).toBe(4)
  expect(screen.getByLabelText('AC').props.maxLength).toBe(2)
})

test('when a separate initiative fails after the enemies exist, the form resets so a retry cannot add them again', async () => {
  mockInit.mockRejectedValue(new AppError('invalid_initiative'))
  setup()
  fillGoblins()
  fireEvent.press(screen.getByRole('button', { name: 'Separate rolls' }))
  set('Goblin 1', '15')
  submit()
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.invalid_initiative))
  await waitFor(() => expect(value('Name')).toBe(''))
  expect(mockAdd).toHaveBeenCalledTimes(1)
})
