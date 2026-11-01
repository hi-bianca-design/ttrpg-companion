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
  expect(renderSection(4, [classPick, { ...classPick, kind: 'subclass' }])()[1]).toBe(true) // 4→5: no ASI due either
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

describe('Ability Score Improvement', () => {
  const scores = { strength: 8, dexterity: 14, constitution: 14, intelligence: 19, wisdom: 12, charisma: 20 }
  function renderAsi(level: number) {
    mockSubclasses.mockReturnValue({ items: [], isLoading: false, isError: false, refetch: jest.fn() })
    const onChange = jest.fn()
    const character = { ...wizard(level), stats: scores }
    render(<LevelUpSection character={character} picks={[classPick, { ...classPick, kind: 'subclass' }]} onChange={onChange} />)
    return () => onChange.mock.calls[onChange.mock.calls.length - 1] as [Record<string, unknown>, boolean]
  }

  test.each([3, 7, 11, 15, 18])('offered when reaching level %i + 1', (level) => {
    renderAsi(level)
    expect(screen.getByText('Ability Score Improvement')).toBeTruthy()
  })

  test.each([1, 2, 4, 5, 9, 19])('not offered when reaching level %i + 1, and ready without one', (level) => {
    const last = renderAsi(level)
    expect(screen.queryByText('Ability Score Improvement')).toBeNull()
    expect(last()[1]).toBe(true)
    expect(last()[0]).not.toHaveProperty('asi')
  })

  test('+2 to one ability: not ready until chosen, then reports it', () => {
    const last = renderAsi(3)
    expect(last()[1]).toBe(false)
    fireEvent.press(screen.getByRole('button', { name: 'Dexterity 14, plus 2' }))
    expect(last()).toEqual([expect.objectContaining({ asi: { dexterity: 2 } }), true])
    expect(screen.getByText('Dexterity 14 → 16')).toBeTruthy()
  })

  test('+1 to two abilities: ready only once two are chosen', () => {
    const last = renderAsi(3)
    fireEvent.press(screen.getByRole('button', { name: '+1 to two' }))
    fireEvent.press(screen.getByRole('button', { name: 'Strength 8, plus 1' }))
    expect(last()[1]).toBe(false)
    fireEvent.press(screen.getByRole('button', { name: 'Wisdom 12, plus 1' }))
    expect(last()).toEqual([expect.objectContaining({ asi: { strength: 1, wisdom: 1 } }), true])
    expect(screen.getByRole('button', { name: 'Dexterity 14, plus 1' })).toBeDisabled()
  })

  test('capped at 20: a 20 cannot rise, a 19 can only take +1', () => {
    renderAsi(3)
    expect(screen.getByRole('button', { name: 'Charisma 20, plus 2' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Intelligence 19, plus 2' })).toBeDisabled()
    fireEvent.press(screen.getByRole('button', { name: '+1 to two' }))
    expect(screen.getByRole('button', { name: 'Intelligence 19, plus 1' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Charisma 20, plus 1' })).toBeDisabled()
  })
})
