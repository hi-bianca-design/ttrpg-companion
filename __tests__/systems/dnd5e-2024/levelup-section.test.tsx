import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { getSystem } from '@/systems/registry'
import type { CharacterRecord, PickRecord } from '@/systems/types'

const mockSubclasses = jest.fn()
jest.mock('@/systems/dnd5e-2024/steps/shared', () => ({
  ...jest.requireActual('@/systems/dnd5e-2024/steps/shared'),
  useDndContent: (...a: unknown[]) => mockSubclasses(...a),
}))

const LevelUpSection = getSystem('dnd5e-2024').sheet!.sections!.levelUp!

function wizard(level: number): CharacterRecord {
  return {
    id: 'c1', system_id: 'dnd5e-2024', name: 'Mira', level,
    stats: { constitution: 14 }, resources: {}, conditions: [], details: {},
  }
}
const classPick: PickRecord = { content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1, content: { name: 'Wizard', data: { hit_die: 6 } } }
const evoker = { id: 'evk', name: 'Evoker', description: null, parent_id: 'cls', owned: false, data: { features: {} } }

function renderSection(level: number, picks: PickRecord[] = [classPick]) {
  const onChange = jest.fn()
  render(<LevelUpSection character={wizard(level)} picks={picks} onChange={onChange} />)
  return () => onChange.mock.calls[onChange.mock.calls.length - 1] as [Record<string, unknown>, boolean]
}

beforeEach(() => mockSubclasses.mockReset())

test('not ready while subclass content is loading and a subclass is due', () => {
  mockSubclasses.mockReturnValue({ items: [], isLoading: true, isError: false, refetch: jest.fn() })
  const last = renderSection(2)
  expect(last()[1]).toBe(false)
})

test('not ready when subclass content failed to load', () => {
  mockSubclasses.mockReturnValue({ items: [], isLoading: false, isError: true, refetch: jest.fn() })
  const last = renderSection(2)
  expect(last()[1]).toBe(false)
})

test('ready only after a subclass is chosen, and reports it in the input', () => {
  mockSubclasses.mockReturnValue({ items: [evoker], isLoading: false, isError: false, refetch: jest.fn() })
  const last = renderSection(2)
  expect(last()[1]).toBe(false)
  fireEvent.press(screen.getByRole('button', { name: 'Evoker' }))
  expect(last()).toEqual([expect.objectContaining({ hpMethod: 'average', subclassId: 'evk' }), true])
})

test('ready without a subclass when none is due', () => {
  mockSubclasses.mockReturnValue({ items: [], isLoading: false, isError: false, refetch: jest.fn() })
  expect(renderSection(3, [classPick, { ...classPick, kind: 'subclass' }])()[1]).toBe(true)
  expect(renderSection(1)()[1]).toBe(true)
})

test('an invalid roll is not ready and never shows NaN', () => {
  mockSubclasses.mockReturnValue({ items: [], isLoading: false, isError: false, refetch: jest.fn() })
  const last = renderSection(1)
  fireEvent.press(screen.getByRole('button', { name: 'Roll the d6' }))
  fireEvent.changeText(screen.getByLabelText('Your roll'), 'abc')
  expect(last()[1]).toBe(false)
  expect(screen.queryByText(/NaN/)).toBeNull()
  fireEvent.changeText(screen.getByLabelText('Your roll'), '5')
  expect(last()).toEqual([expect.objectContaining({ hpMethod: 'roll', roll: 5 }), true])
})
