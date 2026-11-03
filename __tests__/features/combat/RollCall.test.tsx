import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { PortalHost } from '@rn-primitives/portal'
import { TextInput } from 'react-native'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { getCombatEntries, setInitiative, startCombat, type CombatEntry } from '@/features/combat/combat.api'
import { RollCall } from '@/features/combat/RollCall'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { character, combat, enemy, entry } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const mockEntries = getCombatEntries as jest.Mock
const mockInit = setInitiative as jest.Mock
const mockStart = startCombat as jest.Mock

const party = [character('c1', 'Mira'), character('c2', 'Bram'), character('c3', 'Tess')]
const players = [
  entry({ id: 'p1', user_id: 'u1', character_id: 'c1', position: 1 }),
  entry({ id: 'p2', user_id: 'u2', character_id: 'c2', position: 2 }),
  entry({ id: 'p3', user_id: 'u3', character_id: 'c3', position: 3 }),
]
const goblin = enemy({ id: 'g1', name: 'Goblin 1', position: 4 })
const rolling = combat({ status: 'rolling' })

let client: QueryClient
function setup(entries: CombatEntry[] = [...players, goblin]) {
  mockEntries.mockResolvedValue(entries)
  client = makeTestQueryClient()
  client.setQueryData(qk.combatEntries('cb1'), entries)
  const ui = (
    <QueryClientProvider client={client}>
      <RollCall combat={rolling} party={party} />
      <PortalHost />
    </QueryClientProvider>
  )
  return render(ui)
}
const field = (name: string) => screen.getByLabelText(`Initiative for ${name}`)

beforeEach(() => {
  jest.clearAllMocks()
  mockInit.mockResolvedValue({})
  mockStart.mockResolvedValue({})
})

test('a row per entry: player names, and enemies with an Enemy tag', () => {
  setup()
  for (const n of ['Mira', 'Bram', 'Tess', 'Goblin 1']) expect(screen.getByText(n)).toBeTruthy()
  expect(screen.getByText('Roll initiative')).toBeTruthy()
  expect(screen.getAllByText('Enemy')).toHaveLength(1)
})

test('the fields advance with enter and use a keyboard that has a return key and a minus', () => {
  setup()
  // iOS number-pad has neither a return key nor a minus sign, so a typed number could never be sent.
  expect(field('Mira').props.keyboardType).toBe('numbers-and-punctuation')
  expect(field('Mira').props.returnKeyType).toBe('next')
  expect(field('Mira').props.blurOnSubmit).toBe(false)
})

test('typing 18 and submitting sets it, and focus moves to the next row', async () => {
  setup()
  const focus = jest.spyOn(TextInput.prototype as never, 'focus' as never)
  fireEvent.changeText(field('Mira'), '18')
  fireEvent(field('Mira'), 'submitEditing')
  await waitFor(() => expect(mockInit).toHaveBeenCalledWith('p1', 18))
  const inputs = screen.UNSAFE_getAllByType(TextInput)
  expect(focus.mock.contexts).toContain(inputs[1].instance)
  expect(focus.mock.contexts).not.toContain(inputs[0].instance)
})

test('the last row’s submit does not move focus on', async () => {
  setup()
  const focus = jest.spyOn(TextInput.prototype as never, 'focus' as never)
  fireEvent.changeText(field('Goblin 1'), '9')
  fireEvent(field('Goblin 1'), 'submitEditing')
  await waitFor(() => expect(mockInit).toHaveBeenCalledWith('g1', 9))
  expect(focus).not.toHaveBeenCalled()
})

test('the typed value shows at once while the request is pending', async () => {
  let release: (v: unknown) => void = () => {}
  mockInit.mockReturnValue(new Promise((r) => { release = r }))
  setup()
  fireEvent.changeText(field('Mira'), '18')
  fireEvent(field('Mira'), 'submitEditing')
  expect(field('Mira').props.value).toBe('18')
  await act(async () => { release({}) })
})

test('the rows follow the server order when the entries come back re-sorted', async () => {
  setup()
  await act(async () => {}) // let the on-mount fetch settle first
  const resorted = [{ ...players[1], position: 1, initiative: 20 }, { ...players[0], position: 2, initiative: 18 }, players[2], goblin]
  mockEntries.mockResolvedValue(resorted)
  await act(async () => { client.setQueryData(qk.combatEntries('cb1'), resorted) })
  await waitFor(() => expect(field('Bram').props.value).toBe('20'))
  const labels = screen.UNSAFE_getAllByType(TextInput).map((i) => i.props.accessibilityLabel)
  expect(labels).toEqual(['Initiative for Bram', 'Initiative for Mira', 'Initiative for Tess', 'Initiative for Goblin 1'])
})

test('blank rows show the go-last hint and Start combat stays enabled', () => {
  setup()
  expect(screen.getByText('4 rows have no number yet. They go last.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Start combat' })).toBeEnabled()
})

test('the hint is singular for one blank row and gone when none are blank', () => {
  setup([{ ...players[0], initiative: 10 }, { ...players[1], initiative: 9 }, { ...players[2], initiative: 8 }, goblin])
  expect(screen.getByText('1 row has no number yet. It goes last.')).toBeTruthy()
  screen.unmount()
  setup([{ ...players[0], initiative: 10 }])
  expect(screen.queryByText(/no number yet/)).toBeNull()
})

test('Start combat calls startCombat once even when tapped twice', async () => {
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'Start combat' }))
  fireEvent.press(screen.getByRole('button', { name: 'Start combat' }))
  await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1))
  expect(mockStart).toHaveBeenCalledWith('cb1')
})

test.each(['not_rolling', 'no_active_combat'] as const)('%s toasts and refetches', async (code) => {
  mockInit.mockRejectedValue(new AppError(code))
  setup()
  mockEntries.mockClear()
  fireEvent.changeText(field('Mira'), '18')
  fireEvent(field('Mira'), 'submitEditing')
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY[code]))
  await waitFor(() => expect(mockEntries).toHaveBeenCalled())
})

test('a failed Start combat toasts too', async () => {
  mockStart.mockRejectedValue(new AppError('not_rolling'))
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'Start combat' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.not_rolling))
})

test('letters are stripped and values are clamped to -20..99 before sending', async () => {
  setup()
  fireEvent.changeText(field('Mira'), '1a8')
  expect(field('Mira').props.value).toBe('18')
  fireEvent.changeText(field('Bram'), '250')
  fireEvent(field('Bram'), 'submitEditing')
  await waitFor(() => expect(mockInit).toHaveBeenCalledWith('p2', 99))
  fireEvent.changeText(field('Tess'), '-50')
  fireEvent(field('Tess'), 'submitEditing')
  await waitFor(() => expect(mockInit).toHaveBeenCalledWith('p3', -20))
})

test('clearing a number sends null', async () => {
  setup([{ ...players[0], initiative: 12 }])
  fireEvent.changeText(field('Mira'), '')
  fireEvent(field('Mira'), 'submitEditing')
  await waitFor(() => expect(mockInit).toHaveBeenCalledWith('p1', null))
})

test('submitting the number a row already has makes no request', async () => {
  setup([{ ...players[0], initiative: 12 }])
  fireEvent(field('Mira'), 'submitEditing')
  expect(mockInit).not.toHaveBeenCalled()
})

test('with no one in the fight the empty copy shows and Add enemy still opens the form', () => {
  setup([])
  expect(screen.getByText('No one has joined with a character yet')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Add enemy' }))
  expect(screen.getByLabelText('Max HP')).toBeTruthy()
})

test('a number is saved when the field loses focus, with no return key needed', async () => {
  setup()
  fireEvent.changeText(field('Mira'), '18')
  fireEvent(field('Mira'), 'endEditing')
  await waitFor(() => expect(mockInit).toHaveBeenCalledWith('p1', 18))
})

test('enter then end-editing for the same number is one request', async () => {
  setup()
  fireEvent.changeText(field('Mira'), '18')
  fireEvent(field('Mira'), 'submitEditing')
  fireEvent(field('Mira'), 'endEditing')
  await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1))
})

test('Start combat first sends every number still typed, then starts', async () => {
  const order: string[] = []
  mockInit.mockImplementation(async (id: string) => { order.push(`init:${id}`); return {} })
  mockStart.mockImplementation(async () => { order.push('start'); return {} })
  setup()
  fireEvent.changeText(field('Mira'), '18')
  fireEvent.changeText(field('Bram'), '12')
  fireEvent.press(screen.getByRole('button', { name: 'Start combat' }))
  await waitFor(() => expect(mockStart).toHaveBeenCalled())
  expect(order).toEqual(['init:p1', 'init:p2', 'start'])
})
