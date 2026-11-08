import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { EncounterPicker } from '@/features/combat/EncounterPicker'
import type { Encounter } from '@/features/encounters/encounters.api'

const ambush = { id: 'e1', name: 'Goblin Ambush', enemies: [{ count: 2 }, { count: 1 }] } as unknown as Encounter
const lair = { id: 'e2', name: 'Wolf Lair', enemies: [] } as unknown as Encounter

describe('players and plain use (no authoring callbacks)', () => {
  test('no New encounter, Edit or Delete controls appear', () => {
    render(<EncounterPicker encounters={[ambush]} onPick={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /new encounter/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^edit/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^delete/i })).toBeNull()
  })
  test('the empty state has no button', () => {
    render(<EncounterPicker encounters={[]} onPick={jest.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('GM authoring callbacks', () => {
  test('New encounter sits above the list and calls onCreate', () => {
    const onCreate = jest.fn()
    render(<EncounterPicker encounters={[ambush]} onPick={jest.fn()} onCreate={onCreate} />)
    expect(screen.getAllByRole('button')[0].props.accessibilityLabel).toBe('New encounter')
    fireEvent.press(screen.getByRole('button', { name: 'New encounter' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })
  test('the empty state gets a New encounter button', () => {
    const onCreate = jest.fn()
    render(<EncounterPicker encounters={[]} onPick={jest.fn()} onCreate={onCreate} />)
    expect(screen.getAllByRole('button', { name: 'New encounter' })).toHaveLength(1)
    fireEvent.press(screen.getByRole('button', { name: 'New encounter' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })
  test('each row has Edit and Delete that report that encounter, and picking still only picks', () => {
    const onPick = jest.fn(), onEdit = jest.fn(), onDelete = jest.fn()
    render(<EncounterPicker encounters={[ambush, lair]} onPick={onPick} onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.press(screen.getByRole('button', { name: 'Edit Wolf Lair' }))
    expect(onEdit).toHaveBeenCalledWith(lair)
    fireEvent.press(screen.getByRole('button', { name: 'Delete Goblin Ambush' }))
    expect(onDelete).toHaveBeenCalledWith(ambush)
    fireEvent.press(screen.getByRole('button', { name: 'Goblin Ambush' }))
    expect(onPick).toHaveBeenCalledWith('e1')
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})
