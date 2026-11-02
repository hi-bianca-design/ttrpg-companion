import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { usePreventRemove } from '@react-navigation/native'
import { DiscardDraftGuard } from '@/features/characters/builder/DiscardDraftGuard'
import { isDraftDirty, useBuilderStore } from '@/features/characters/builder/builder.store'
import { variantOf } from '../../helpers/button'

const mockDispatch = jest.fn()
jest.mock('@react-navigation/native', () => ({
  usePreventRemove: jest.fn(),
  useNavigation: () => ({ dispatch: mockDispatch }),
}))

const store = () => useBuilderStore.getState()
const POP = { type: 'POP', payload: { count: 1 } }

beforeEach(() => {
  jest.clearAllMocks()
  store().reset()
  store().start('dnd5e-2024')
})

function renderGuard() {
  return render(<><DiscardDraftGuard /><PortalHost /></>)
}

/** The latest (preventRemove, callback) the guard registered. */
function lastGuard() {
  const calls = (usePreventRemove as jest.Mock).mock.calls
  return calls[calls.length - 1] as [boolean, (e: { data: { action: unknown } }) => void]
}

function leave() {
  act(() => lastGuard()[1]({ data: { action: POP } }))
}

test('a fresh draft is not dirty, so leaving does not prompt', () => {
  expect(isDraftDirty('dnd5e-2024', store().draft)).toBe(false)
  renderGuard()
  expect(lastGuard()[0]).toBe(false)
})

test('a draft with any choice blocks leaving', () => {
  act(() => store().update({ class_id: 'wizard', class_name: 'Wizard' }))
  renderGuard()
  expect(lastGuard()[0]).toBe(true)
})

test('leaving a named draft asks "Discard <name>?" with Keep editing / Discard', () => {
  act(() => store().update({ name: 'Mira' }))
  renderGuard()
  leave()
  expect(screen.getByText('Discard Mira?')).toBeTruthy()
  expect(variantOf(screen.getByRole('button', { name: 'Keep editing' }))).toBe('outline')
  expect(variantOf(screen.getByRole('button', { name: 'Discard' }))).toBe('destructive')
})

test('an unnamed draft is "this character"', () => {
  act(() => store().update({ class_id: 'wizard', class_name: 'Wizard' }))
  renderGuard()
  leave()
  expect(screen.getByText('Discard this character?')).toBeTruthy()
})

test('Keep editing stays in the wizard and keeps the draft', () => {
  act(() => store().update({ name: 'Mira' }))
  renderGuard()
  leave()
  fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }))
  expect(screen.queryByText('Discard Mira?')).toBeNull()
  expect(mockDispatch).not.toHaveBeenCalled()
  expect(store().draft.name).toBe('Mira')
})

test('Discard leaves with the blocked action and resets the builder store', async () => {
  act(() => store().update({ name: 'Mira' }))
  renderGuard()
  leave()
  fireEvent.press(screen.getByRole('button', { name: 'Discard' }))
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(POP))
  await waitFor(() => expect(store().systemId).toBeNull())
  expect(store().draft).toEqual({})
  // Still-mounted step screens read this and render nothing instead of redirecting back in.
  expect(store().exiting).toBe(true)
})

test('once the wizard is exiting on purpose (character saved), leaving does not prompt', () => {
  act(() => store().update({ name: 'Mira' }))
  act(() => store().exit())
  renderGuard()
  expect(lastGuard()[0]).toBe(false)
})
