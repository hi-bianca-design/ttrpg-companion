import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { getSystem } from '@/systems/registry'
import type { CharacterRecord, PickRecord } from '@/systems/types'

const Languages = getSystem('dnd5e-2024').sheet!.sections!.languages

const char = (details: Record<string, unknown>): CharacterRecord =>
  ({ id: 'c1', system_id: 'dnd5e-2024', name: 'Mira', level: 1, stats: {}, resources: {}, conditions: [], details })
const cls = (name: string): PickRecord =>
  ({ content_id: name, kind: 'class', state: {}, acquired_at_level: 1, content: { name, data: {} } })

function setup(details: Record<string, unknown>, picks: PickRecord[] = [], onSaveDetails: jest.Mock | null = jest.fn()) {
  render(<><Languages character={char(details)} picks={picks} onSaveDetails={onSaveDetails ?? undefined} /><PortalHost /></>)
  return onSaveDetails
}

test('D&D registers a languages section', () => {
  expect(Languages).toBeDefined()
})

test('lists the recorded languages and offers Edit at any time', () => {
  setup({ languages: ['Common', 'Elvish'] })
  expect(screen.getByText('Languages')).toBeTruthy()
  expect(screen.getByText('Elvish')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Edit languages' })).toBeTruthy()
})

test('an unset list says so, offers Add, and writes nothing on render', () => {
  const onSave = setup({})
  expect(screen.getByText('No languages recorded yet')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Add languages' })).toBeTruthy()
  expect(onSave).not.toHaveBeenCalled()
})

test('without onSaveDetails there is no edit control', () => {
  setup({}, [], null)
  expect(screen.queryByRole('button', { name: 'Add languages' })).toBeNull()
  setup({ languages: ['Common'] }, [], null)
  expect(screen.queryByRole('button', { name: 'Edit languages' })).toBeNull()
})

test('the editor for an unset Druid is prefilled with Common and Druidic; Apply saves them', () => {
  const onSave = setup({}, [cls('Druid')])
  fireEvent.press(screen.getByRole('button', { name: 'Add languages' }))
  expect(screen.getByText('Common')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Remove Druidic' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Remove Common' })).toBeNull()
  fireEvent.press(screen.getByRole('button', { name: 'Apply' }))
  expect(onSave).toHaveBeenCalledTimes(1)
  expect(onSave).toHaveBeenCalledWith({ languages: ['Common', 'Druidic'] })
})

test('adds a typed language once, removes one, and cuts a long entry to 40 characters', () => {
  const onSave = setup({ languages: ['Common', 'Sylvan'] })
  fireEvent.press(screen.getByRole('button', { name: 'Edit languages' }))
  for (const t of [' elvish ', 'Elvish', 'x'.repeat(200)]) {
    fireEvent.changeText(screen.getByLabelText('Add a language'), t)
    fireEvent.press(screen.getByRole('button', { name: 'Add language' }))
  }
  fireEvent.press(screen.getByRole('button', { name: 'Remove Sylvan' }))
  fireEvent.press(screen.getByRole('button', { name: 'Apply' }))
  expect(onSave).toHaveBeenCalledWith({ languages: ['Common', 'elvish', 'x'.repeat(40)] })
})

test('Common cannot be removed or re-added', () => {
  const onSave = setup({ languages: ['Elvish'] })
  fireEvent.press(screen.getByRole('button', { name: 'Edit languages' }))
  fireEvent.changeText(screen.getByLabelText('Add a language'), 'common')
  fireEvent.press(screen.getByRole('button', { name: 'Add language' }))
  fireEvent.press(screen.getByRole('button', { name: 'Apply' }))
  expect(onSave).toHaveBeenCalledWith({ languages: ['Common', 'Elvish'] })
})
