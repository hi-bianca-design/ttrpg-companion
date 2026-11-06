import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { BulkBar } from '@/features/combat/BulkBar'
import type { EnemyHp } from '@/features/combat/useEnemyHp'

function setup(ok = true, ids = ['a', 'b', 'c', 'd']) {
  const hp: EnemyHp = { apply: jest.fn().mockResolvedValue(ok), undoFor: jest.fn(), canUndo: () => false, pending: false }
  const onClear = jest.fn()
  render(<BulkBar selectedIds={ids} hp={hp} onClear={onClear} />)
  return { hp, onClear }
}

test('says how many are selected', () => {
  setup()
  expect(screen.getByText('4 selected')).toBeTruthy()
})

test('one amount applies to every selected row in a single call, then the selection clears', async () => {
  const { hp, onClear } = setup()
  fireEvent.changeText(screen.getByLabelText('Amount'), '5')
  fireEvent.press(screen.getByRole('button', { name: 'Damage' }))
  await waitFor(() => expect(onClear).toHaveBeenCalledTimes(1))
  expect(hp.apply).toHaveBeenCalledTimes(1)
  expect(hp.apply).toHaveBeenCalledWith(['a', 'b', 'c', 'd'], 'damage', 5)
})

test('Heal and Temp HP pass their modes', async () => {
  const { hp } = setup()
  fireEvent.changeText(screen.getByLabelText('Amount'), '3')
  fireEvent.press(screen.getByRole('button', { name: 'Heal' }))
  fireEvent.changeText(screen.getByLabelText('Amount'), '6')
  fireEvent.press(screen.getByRole('button', { name: 'Temp HP' }))
  await waitFor(() => expect(hp.apply).toHaveBeenCalledTimes(2))
  expect(hp.apply).toHaveBeenNthCalledWith(1, ['a', 'b', 'c', 'd'], 'heal', 3)
  expect(hp.apply).toHaveBeenNthCalledWith(2, ['a', 'b', 'c', 'd'], 'temp', 6)
})

test('a failed apply keeps the selection so the GM can try again', async () => {
  const { hp, onClear } = setup(false)
  fireEvent.changeText(screen.getByLabelText('Amount'), '5')
  fireEvent.press(screen.getByRole('button', { name: 'Damage' }))
  await waitFor(() => expect(hp.apply).toHaveBeenCalled())
  expect(onClear).not.toHaveBeenCalled()
})

test('Clear drops the selection without applying anything', () => {
  const { hp, onClear } = setup()
  fireEvent.press(screen.getByRole('button', { name: 'Clear' }))
  expect(onClear).toHaveBeenCalledTimes(1)
  expect(hp.apply).not.toHaveBeenCalled()
})

test('has no Undo of its own: undo lives on each affected row', () => {
  setup()
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
})
