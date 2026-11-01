import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import LevelUpScreen from '../../app/(app)/characters/[id]/level-up'
import { useCharacter, useLevelUp } from '@/features/characters/characters.queries'

jest.mock('@/features/characters/characters.queries', () => ({ useCharacter: jest.fn(), useLevelUp: jest.fn() }))
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({}), useGlobalSearchParams: () => ({ id: 'c1' }) }))
jest.mock('@/components/game/ScreenBackground', () => ({ ScreenBackground: ({ children }: { children: React.ReactNode }) => children }))
jest.mock('@/systems/dnd5e-2024/steps/shared', () => ({
  ...jest.requireActual('@/systems/dnd5e-2024/steps/shared'),
  useDndContent: () => ({ items: [], isLoading: true, isError: false, refetch: jest.fn() }),
}))

function character(level: number) {
  return {
    id: 'c1', system_id: 'dnd5e-2024', name: 'Mira', level, stats: { constitution: 14 }, conditions: [], details: {},
    resources: { hp: { current: 8, max: 8 }, hit_dice: { current: 1, max: 1 } },
    picks: [{ content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1, content: { id: 'cls', kind: 'class', name: 'Wizard', data: { hit_die: 6 } } }],
    items: [], derived: [],
  }
}

beforeEach(() => {
  ;(useLevelUp as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false })
})

test('level 20 shows the Max level state and no Level up button', () => {
  ;(useCharacter as jest.Mock).mockReturnValue({ data: character(20), isLoading: false, isError: false, refetch: jest.fn() })
  render(<LevelUpScreen />)
  expect(screen.getByText('Max level')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Level up' })).toBeNull()
})

test('Level up stays disabled while the subclass list is loading on a 2→3 level up', () => {
  ;(useCharacter as jest.Mock).mockReturnValue({ data: character(2), isLoading: false, isError: false, refetch: jest.fn() })
  render(<LevelUpScreen />)
  expect(screen.getByRole('button', { name: 'Level up' })).toBeDisabled()
})

test('3→4: Level up waits for the ASI, then saves the raised score with the new level', () => {
  const mutate = jest.fn()
  ;(useLevelUp as jest.Mock).mockReturnValue({ mutate, isPending: false })
  const c = character(3)
  c.stats = { strength: 8, dexterity: 14, constitution: 14, intelligence: 15, wisdom: 12, charisma: 10 } as never
  c.picks.push({ ...c.picks[0], content_id: 'sub', kind: 'subclass', content: { id: 'sub', kind: 'subclass', name: 'Evoker', data: {} } } as never)
  ;(useCharacter as jest.Mock).mockReturnValue({ data: c, isLoading: false, isError: false, refetch: jest.fn() })
  render(<LevelUpScreen />)
  expect(screen.getByRole('button', { name: 'Level up' })).toBeDisabled()
  fireEvent.press(screen.getByRole('button', { name: 'Strength 8, plus 2' }))
  expect(screen.getByText('8 → 10')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Level up' }))
  expect(mutate).toHaveBeenCalledWith(
    expect.objectContaining({ patch: expect.objectContaining({ level: 4, stats: expect.objectContaining({ strength: 10 }) }) }),
    expect.anything(),
  )
})
