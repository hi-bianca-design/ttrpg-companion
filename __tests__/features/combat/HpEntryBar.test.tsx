import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { HpEntryBar } from '@/features/combat/HpEntryBar'
import { TEMP_HP_LABEL } from '@/features/combat/copy'
import { variantOf } from '../../helpers/button'

function setup(over: Partial<React.ComponentProps<typeof HpEntryBar>> = {}) {
  const props = { label: 'Goblin 1', canUndo: false, onDamage: jest.fn(), onHeal: jest.fn(), onTemp: jest.fn(), onUndo: jest.fn(), ...over }
  render(<HpEntryBar {...props} />)
  return props
}
const type = (t: string) => fireEvent.changeText(screen.getByLabelText('Amount'), t)

test('typing 7 then Damage calls onDamage(7) once and clears the field', () => {
  const p = setup()
  type('7')
  fireEvent.press(screen.getByRole('button', { name: 'Damage' }))
  expect(p.onDamage).toHaveBeenCalledTimes(1)
  expect(p.onDamage).toHaveBeenCalledWith(7)
  expect(screen.getByLabelText('Amount').props.value).toBe('')
})

test('Heal and Temp HP call their handlers with the number', () => {
  const p = setup()
  type('12')
  fireEvent.press(screen.getByRole('button', { name: 'Heal' }))
  type('4')
  fireEvent.press(screen.getByRole('button', { name: TEMP_HP_LABEL }))
  expect(p.onHeal).toHaveBeenCalledWith(12)
  expect(p.onTemp).toHaveBeenCalledWith(4)
})

test('letters and a decimal point are stripped: 7a.5 becomes 75', () => {
  setup()
  type('7a.5')
  expect(screen.getByLabelText('Amount').props.value).toBe('75')
})

test('the amount is a number pad field of at most four digits', () => {
  setup()
  const field = screen.getByLabelText('Amount')
  expect(field.props.keyboardType).toBe('number-pad')
  expect(field.props.maxLength).toBe(4)
})

test.each(['', '0', '00'])('the three action buttons are disabled for an amount of "%s"', (amount) => {
  const p = setup()
  type(amount)
  for (const name of ['Damage', 'Heal', TEMP_HP_LABEL]) expect(screen.getByRole('button', { name })).toBeDisabled()
  fireEvent.press(screen.getByRole('button', { name: 'Damage' }))
  expect(p.onDamage).not.toHaveBeenCalled()
})

test('Undo shows only when canUndo and calls onUndo', () => {
  setup()
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  screen.unmount()
  const p = setup({ canUndo: true })
  fireEvent.press(screen.getByRole('button', { name: 'Undo' }))
  expect(p.onUndo).toHaveBeenCalledTimes(1)
})

test('Damage is the destructive button, the rest are not red', () => {
  setup({ canUndo: true })
  expect(variantOf(screen.getByRole('button', { name: 'Damage' }))).toBe('destructive')
  for (const name of ['Heal', TEMP_HP_LABEL, 'Undo']) expect(variantOf(screen.getByRole('button', { name }))).not.toBe('destructive')
})

test('every button is the default 44pt size', () => {
  setup({ canUndo: true })
  for (const name of ['Damage', 'Heal', TEMP_HP_LABEL, 'Undo']) {
    expect(screen.getByRole('button', { name }).props.className).toContain('min-h-11')
  }
})

test('disabled turns the whole bar off', () => {
  setup({ disabled: true, canUndo: true })
  type('5')
  expect(screen.getByLabelText('Amount').props.editable).toBe(false)
  for (const name of ['Damage', 'Heal', TEMP_HP_LABEL]) expect(screen.getByRole('button', { name })).toBeDisabled()
})
