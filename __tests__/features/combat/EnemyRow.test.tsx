import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { buildGmOrder, type GmEnemyRow } from '@/features/combat/battleOrder'
import { EnemyRow } from '@/features/combat/EnemyRow'
import type { EnemyHp } from '@/features/combat/useEnemyHp'
import { combat, enemy } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))

function rowOf(over: Parameters<typeof enemy>[0] extends infer T ? Partial<T> : never = {}): GmEnemyRow {
  return buildGmOrder({ combat: combat(), entries: [enemy({ id: 'g1', name: 'Goblin 1', hp: 5, max_hp: 7, temp_hp: 3, ac: 13, notes: 'flees at half', initiative: 12, ...over })], party: [], userId: 'gm' }).rows[0] as GmEnemyRow
}

function setup(row: GmEnemyRow, extra: Partial<React.ComponentProps<typeof EnemyRow>> = {}, canUndo = false) {
  const hp: EnemyHp = { apply: jest.fn().mockResolvedValue(true), undoFor: jest.fn().mockResolvedValue(undefined), canUndo: () => canUndo, pending: false }
  const props = { row, selected: false, onToggleSelect: jest.fn(), onPatch: jest.fn().mockResolvedValue(undefined), onRemove: jest.fn().mockResolvedValue(undefined), hp, ...extra }
  render(<><EnemyRow {...props} /><PortalHost /></>)
  return props
}
const expand = () => fireEvent.press(screen.getByRole('button', { name: /^Goblin 1,/ }))

test('shows name, initiative, hit points as text, temp, AC and notes', () => {
  setup(rowOf())
  expect(screen.getByText('Goblin 1')).toBeTruthy()
  expect(screen.getByText('init 12')).toBeTruthy()
  expect(screen.getByText('5/7')).toBeTruthy()
  expect(screen.getByText('+3 Temp HP')).toBeTruthy()
  expect(screen.getByText('AC 13')).toBeTruthy()
  expect(screen.getByText('flees at half')).toBeTruthy()
})

test('the current row says Current in text, a ▶ marker and in its accessibility label', () => {
  setup(rowOf({ is_current: true }))
  expect(screen.getByText('Current')).toBeTruthy()
  expect(screen.getByText('▶')).toBeTruthy()
  expect(screen.getByRole('button', { name: /current turn/ })).toBeTruthy()
})

test('a row that is not current has no marker', () => {
  setup(rowOf())
  expect(screen.queryByText('▶')).toBeNull()
  expect(screen.queryByText('Current')).toBeNull()
})

test('at 0 it says Down in text', () => {
  setup(rowOf({ hp: 0 }))
  expect(screen.getByText('Down')).toBeTruthy()
  expect(screen.getByText('0/7')).toBeTruthy()
})

test('a hidden enemy is badged Hidden and offers Reveal', () => {
  const p = setup(rowOf({ hidden: true }))
  expect(screen.getByText('Hidden')).toBeTruthy()
  expand()
  fireEvent.press(screen.getByRole('button', { name: 'Reveal' }))
  expect(p.onPatch).toHaveBeenCalledWith({ hidden: false })
})

test('a visible enemy offers Hide', () => {
  const p = setup(rowOf())
  expand()
  fireEvent.press(screen.getByRole('button', { name: 'Hide' }))
  expect(p.onPatch).toHaveBeenCalledWith({ hidden: true })
})

test('the 44pt Select toggle reports and reflects selection', () => {
  const p = setup(rowOf(), { selected: true })
  const toggle = screen.getByRole('button', { name: 'Select Goblin 1' })
  expect(toggle).toHaveAccessibilityState({ selected: true })
  fireEvent.press(toggle)
  expect(p.onToggleSelect).toHaveBeenCalledTimes(1)
})

test('the body is collapsed until tapped, then the HP entry applies to this enemy', () => {
  const p = setup(rowOf())
  expect(screen.queryByLabelText('Amount')).toBeNull()
  expand()
  fireEvent.changeText(screen.getByLabelText('Amount'), '5')
  fireEvent.press(screen.getByRole('button', { name: 'Damage' }))
  expect(p.hp.apply).toHaveBeenCalledWith(['g1'], 'damage', 5)
})

test('Heal and Temp HP pass their modes', () => {
  const p = setup(rowOf())
  expand()
  fireEvent.changeText(screen.getByLabelText('Amount'), '2')
  fireEvent.press(screen.getByRole('button', { name: 'Heal' }))
  fireEvent.changeText(screen.getByLabelText('Amount'), '4')
  fireEvent.press(screen.getByRole('button', { name: 'Temp HP' }))
  expect(p.hp.apply).toHaveBeenNthCalledWith(1, ['g1'], 'heal', 2)
  expect(p.hp.apply).toHaveBeenNthCalledWith(2, ['g1'], 'temp', 4)
})

test('a collapsed row with something to undo shows Undo, which undoes this row', () => {
  const p = setup(rowOf(), {}, true)
  fireEvent.press(screen.getByRole('button', { name: 'Undo' }))
  expect(p.hp.undoFor).toHaveBeenCalledWith('g1')
})

test('Set HP sends the typed exact value, 0 included', () => {
  const p = setup(rowOf())
  expand()
  fireEvent.changeText(screen.getByLabelText('Set HP to'), '0')
  fireEvent.press(screen.getByRole('button', { name: 'Set HP' }))
  expect(p.onPatch).toHaveBeenCalledWith({ hp: 0 })
})

test('Set HP does nothing for a blank field and strips letters', () => {
  const p = setup(rowOf())
  expand()
  fireEvent.press(screen.getByRole('button', { name: 'Set HP' }))
  expect(p.onPatch).not.toHaveBeenCalled()
  fireEvent.changeText(screen.getByLabelText('Set HP to'), '4x.5')
  expect(screen.getByLabelText('Set HP to').props.value).toBe('45')
})

test('the notes editor saves trimmed notes, or null when emptied', () => {
  const p = setup(rowOf())
  expand()
  fireEvent.changeText(screen.getByLabelText('Notes'), '  low on arrows ')
  fireEvent.press(screen.getByRole('button', { name: 'Save notes' }))
  expect(p.onPatch).toHaveBeenCalledWith({ notes: 'low on arrows' })
  fireEvent.changeText(screen.getByLabelText('Notes'), '   ')
  fireEvent.press(screen.getByRole('button', { name: 'Save notes' }))
  expect(p.onPatch).toHaveBeenLastCalledWith({ notes: null })
})

test('Select group only appears when the row has a group', () => {
  setup(rowOf())
  expand()
  expect(screen.queryByRole('button', { name: 'Select group' })).toBeNull()
  screen.unmount()
  const p = setup(rowOf(), { onSelectGroup: jest.fn() })
  expand()
  fireEvent.press(screen.getByRole('button', { name: 'Select group' }))
  expect(p.onSelectGroup).toHaveBeenCalledTimes(1)
})

test('Remove needs the confirm, and Cancel does not remove', async () => {
  const p = setup(rowOf())
  expand()
  fireEvent.press(screen.getByRole('button', { name: 'Remove' }))
  expect(p.onRemove).not.toHaveBeenCalled()
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
  expect(p.onRemove).not.toHaveBeenCalled()
  fireEvent.press(screen.getByRole('button', { name: 'Remove' }))
  fireEvent.press(screen.getByRole('button', { name: 'Remove Goblin 1' }))
  await waitFor(() => expect(p.onRemove).toHaveBeenCalledTimes(1))
})

test('a 60-character name stays on one line', () => {
  const name = 'G'.repeat(60)
  setup(rowOf({ name }))
  expect(screen.getByText(name).props.numberOfLines).toBe(1)
})
