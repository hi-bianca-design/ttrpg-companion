import { fireEvent, render, screen } from '@testing-library/react-native'
import { CustomEntryForm } from '@/features/characters/builder/CustomEntryForm'
import type { FieldDef } from '@/systems/types'

const FIELDS: FieldDef[] = [
  { key: 'hit_die', label: 'Hit die', type: 'select', options: ['d6', 'd8', 'd10'] },
  { key: 'skills', label: 'Skills', type: 'multiselect', options: ['Arcana', 'History', 'Stealth'] },
  { key: 'size', label: 'Size note', type: 'text' },
  { key: 'speed', label: 'Speed', type: 'number' },
  { key: 'darkvision', label: 'Darkvision', type: 'boolean' },
]

function setup(props: Partial<React.ComponentProps<typeof CustomEntryForm>> = {}) {
  const onSubmit = jest.fn()
  const onCancel = jest.fn()
  render(
    <CustomEntryForm kindLabel="Class" fields={FIELDS} officialNames={['Wizard', 'Rogue']} onSubmit={onSubmit} onCancel={onCancel} {...props} />,
  )
  return { onSubmit, onCancel }
}

const name = (v: string) => fireEvent.changeText(screen.getByLabelText('Class name'), v)
const save = () => screen.getByLabelText('Save class')
const COLLISION = "An official class has this name; picking it applies that class's rules."

test('Save is disabled for an empty or whitespace-only name and enabled otherwise', () => {
  const { onSubmit } = setup()
  expect(save()).toBeDisabled()
  name('   ')
  expect(save()).toBeDisabled()
  fireEvent.press(save())
  expect(onSubmit).not.toHaveBeenCalled()
  name('Bard of Ash')
  expect(save()).toBeEnabled()
})

test('Save submits once with the trimmed name and only the filled extras', () => {
  const { onSubmit } = setup()
  name('  Ashen Knight  ')
  fireEvent.changeText(screen.getByLabelText('Class description'), 'Burns bright')
  fireEvent.press(screen.getByLabelText('d8'))
  fireEvent.press(screen.getByLabelText('Arcana'))
  fireEvent.press(screen.getByLabelText('Stealth'))
  fireEvent.changeText(screen.getByLabelText('Speed'), '30')
  expect(onSubmit).not.toHaveBeenCalled()
  fireEvent.press(save())
  expect(onSubmit).toHaveBeenCalledTimes(1)
  expect(onSubmit).toHaveBeenCalledWith({
    name: 'Ashen Knight',
    description: 'Burns bright',
    library: false,
    extras: { hit_die: 'd8', skills: ['Arcana', 'Stealth'], speed: 30 },
  })
})

test('with nothing filled the extras object is empty', () => {
  const { onSubmit } = setup()
  name('Plain')
  fireEvent.press(save())
  expect(onSubmit).toHaveBeenCalledWith({ name: 'Plain', description: '', library: false, extras: {} })
})

test('toggling the library chip submits library true', () => {
  const { onSubmit } = setup()
  name('Plain')
  fireEvent.press(screen.getByLabelText('Add to my homebrew library'))
  fireEvent.press(save())
  expect(onSubmit.mock.calls[0][0].library).toBe(true)
})

test('an official name shows the collision note and Save stays enabled; other names show none', () => {
  setup()
  name('  wizard ')
  expect(screen.getByText(COLLISION)).toBeTruthy()
  expect(save()).toBeEnabled()
  name('Warlock')
  expect(screen.queryByText(COLLISION)).toBeNull()
})

test('a 100-character name is capped at 80', () => {
  const { onSubmit } = setup()
  expect(screen.getByLabelText('Class name').props.maxLength).toBe(80)
  name('a'.repeat(100))
  fireEvent.press(save())
  expect(onSubmit.mock.calls[0][0].name).toHaveLength(80)
})

test('initial values prefill and are submitted back unchanged', () => {
  const initial = { name: 'Ashen Knight', description: 'Burns', library: true, extras: { hit_die: 'd10', skills: ['History'], size: 'Medium', speed: 25, darkvision: true } }
  const { onSubmit } = setup({ initial })
  expect(screen.getByLabelText('Class name').props.value).toBe('Ashen Knight')
  fireEvent.press(save())
  expect(onSubmit).toHaveBeenCalledWith(initial)
})

test('Cancel calls onCancel and never onSubmit', () => {
  const { onSubmit, onCancel } = setup()
  name('x')
  fireEvent.press(screen.getByLabelText('Cancel'))
  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onSubmit).not.toHaveBeenCalled()
})

test('select can be cleared, multiselect toggles, boolean toggles, number keeps digits only and may be emptied', () => {
  const { onSubmit } = setup()
  name('Z')
  fireEvent.press(screen.getByLabelText('d6'))
  fireEvent.press(screen.getByLabelText('d10'))
  fireEvent.press(screen.getByLabelText('d10'))
  fireEvent.press(screen.getByLabelText('History'))
  fireEvent.press(screen.getByLabelText('History'))
  fireEvent.press(screen.getByLabelText('Darkvision'))
  fireEvent.changeText(screen.getByLabelText('Speed'), '3a0')
  expect(screen.getByLabelText('Speed').props.value).toBe('30')
  fireEvent.changeText(screen.getByLabelText('Size note'), 'Small')
  fireEvent.press(save())
  expect(onSubmit.mock.calls[0][0].extras).toEqual({ size: 'Small', speed: 30, darkvision: true })
})

test('an emptied number is omitted', () => {
  const { onSubmit } = setup()
  name('Z')
  fireEvent.changeText(screen.getByLabelText('Speed'), '5')
  fireEvent.changeText(screen.getByLabelText('Speed'), '')
  fireEvent.press(save())
  expect(onSubmit.mock.calls[0][0].extras).toEqual({})
})
