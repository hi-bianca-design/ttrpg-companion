import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { ContentForm } from '@/features/content/ContentForm'
import { saveHomebrew, deleteHomebrew, listContent } from '@/features/content/content.api'
import { AppError } from '@/features/errors'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/content/content.api', () => ({
  saveHomebrew: jest.fn(),
  deleteHomebrew: jest.fn(),
  listContent: jest.fn(),
}))

function renderForm(props: Partial<React.ComponentProps<typeof ContentForm>> & { kind?: string } = {}) {
  const onSaved = jest.fn()
  const onDeleted = jest.fn()
  const client = makeTestQueryClient()
  render(
    <QueryClientProvider client={client}>
      <ContentForm systemId="dnd5e-2024" kind="spell" onSaved={onSaved} onDeleted={onDeleted} {...props} />
      <PortalHost />
    </QueryClientProvider>,
  )
  return { onSaved, onDeleted }
}

function fillSpell({ level = true } = {}) {
  fireEvent.changeText(screen.getByLabelText('Name'), 'Frost Lance')
  if (level) fireEvent.press(screen.getByRole('button', { name: 'Level 1' }))
  fireEvent.press(screen.getByRole('button', { name: 'School Evocation' }))
  fireEvent.changeText(screen.getByLabelText('Casting time'), 'Action')
  fireEvent.changeText(screen.getByLabelText('Range'), '60 feet')
  fireEvent.changeText(screen.getByLabelText('Components'), 'V, S')
  fireEvent.changeText(screen.getByLabelText('Duration'), 'Instantaneous')
  fireEvent.press(screen.getByRole('button', { name: 'Classes Wizard' }))
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(listContent as jest.Mock).mockResolvedValue([])
})

test('a spell without a level shows a field error and does not save', async () => {
  renderForm()
  fillSpell({ level: false })
  fireEvent.press(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByText('Level is required')).toBeTruthy()
  expect(saveHomebrew).not.toHaveBeenCalled()
})

test('a valid spell saves with level as a number', async () => {
  ;(saveHomebrew as jest.Mock).mockResolvedValue({ id: 'c1' })
  const { onSaved } = renderForm()
  fillSpell()
  fireEvent(screen.getByRole('switch', { name: 'Concentration' }), 'valueChange', true)
  fireEvent.press(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(saveHomebrew).toHaveBeenCalledTimes(1))
  const arg = (saveHomebrew as jest.Mock).mock.calls[0][0]
  expect(arg).toMatchObject({ systemId: 'dnd5e-2024', kind: 'spell', name: 'Frost Lance' })
  expect(arg.data).toMatchObject({
    level: 1, school: 'Evocation', classes: ['wizard'], requires_concentration: true, is_ritual: false,
  })
  expect(typeof arg.data.level).toBe('number')
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 'c1' }))
})

test('a duplicate name shows an error on Name', async () => {
  ;(saveHomebrew as jest.Mock).mockRejectedValue(new AppError('duplicate'))
  const { onSaved } = renderForm()
  fillSpell()
  fireEvent.press(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByText('You already have a spell with this name.')).toBeTruthy()
  expect(onSaved).not.toHaveBeenCalled()
})

test('a subclass requires a parent class', async () => {
  ;(listContent as jest.Mock).mockResolvedValue([{ id: 'cls1', name: 'Fighter' }])
  renderForm({ kind: 'subclass' })
  fireEvent.changeText(screen.getByLabelText('Name'), 'Rune Knight')
  fireEvent.press(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByText('Class is required')).toBeTruthy()
  expect(saveHomebrew).not.toHaveBeenCalled()
  fireEvent.press(await screen.findByRole('button', { name: 'Class Fighter' }))
  ;(saveHomebrew as jest.Mock).mockResolvedValue({ id: 'c2' })
  fireEvent.press(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(saveHomebrew).toHaveBeenCalledWith(expect.objectContaining({ kind: 'subclass', parentId: 'cls1' })))
})

test('editing prefills, saves with the id and can delete after confirming', async () => {
  ;(deleteHomebrew as jest.Mock).mockResolvedValue(undefined)
  const initial = {
    id: 'c1', name: 'Frost Lance', description: null, parent_id: null,
    data: { level: 2, school: 'Evocation', casting_time: 'Action', range: '60 feet', components: 'V', duration: 'Instant', classes: ['wizard'], is_ritual: false, requires_concentration: false },
  } as never
  const { onDeleted } = renderForm({ initial })
  expect(screen.getByLabelText('Name').props.value).toBe('Frost Lance')
  fireEvent.press(screen.getByRole('button', { name: 'Delete' }))
  expect(screen.getByText('Delete Frost Lance?')).toBeTruthy()
  expect(deleteHomebrew).not.toHaveBeenCalled()
  await act(async () => { fireEvent.press(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!) })
  await waitFor(() => expect(deleteHomebrew).toHaveBeenCalledWith('c1'))
  await waitFor(() => expect(onDeleted).toHaveBeenCalled())
})

const featRow = (data: unknown) => ({ id: 'f1', name: 'Tough Guy', description: null, parent_id: null, data }) as never

test('editing keeps nested data keys the form does not expose', async () => {
  ;(saveHomebrew as jest.Mock).mockResolvedValue({ id: 'f1' })
  renderForm({ kind: 'feat', initial: featRow({ benefits: 'More HP', prerequisites: { level: 4 }, ability_score_bonuses: { constitution: 1 } }) })
  fireEvent.changeText(screen.getByLabelText('Benefits'), 'Even more HP')
  fireEvent.press(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(saveHomebrew).toHaveBeenCalledTimes(1))
  expect((saveHomebrew as jest.Mock).mock.calls[0][0].data).toEqual({
    benefits: 'Even more HP', prerequisites: { level: 4 }, ability_score_bonuses: { constitution: 1 },
  })
})

test('a schema issue outside the visible fields blocks the save with a form error', async () => {
  renderForm({ kind: 'feat', initial: featRow({ benefits: 'More HP', prerequisites: 'bad' }) })
  fireEvent.press(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(screen.getByTestId('form-error')).toBeTruthy())
  expect(saveHomebrew).not.toHaveBeenCalled()
})
