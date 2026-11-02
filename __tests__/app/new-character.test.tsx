import { fireEvent, render, screen } from '@testing-library/react-native'
import NewCharacterScreen from '../../app/(app)/characters/new'
import { useBuilderStore } from '@/features/characters/builder/builder.store'
import { SYSTEMS, visibleSystems } from '@/systems/registry'

const mockRouter = { replace: jest.fn() }
const mockRedirect = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  Redirect: (props: { href: string }) => { mockRedirect(props.href); return null },
}))
jest.mock('@/components/game', () => ({
  ...jest.requireActual('@/components/game'),
  ScreenBackground: ({ children }: { children: React.ReactNode }) => children,
}))
// Real registry by default; a test may make every system visible.
jest.mock('@/systems/registry', () => {
  const actual = jest.requireActual('@/systems/registry')
  return { ...actual, visibleSystems: jest.fn(actual.visibleSystems) }
})

const mockVisible = visibleSystems as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockVisible.mockImplementation(jest.requireActual('@/systems/registry').visibleSystems)
  useBuilderStore.getState().reset()
})

test('with only D&D visible (real registry), New character goes straight into the D&D flow', () => {
  render(<NewCharacterScreen />)
  expect(useBuilderStore.getState().systemId).toBe('dnd5e-2024')
  expect(mockRedirect).toHaveBeenCalledWith('/(app)/characters/new/class')
  expect(screen.queryByText('Which game is this character for?')).toBeNull()
})

test('with D&D and Daggerheart visible, New character asks which game first', () => {
  mockVisible.mockReturnValue(SYSTEMS)
  render(<NewCharacterScreen />)
  expect(mockRedirect).not.toHaveBeenCalled()
  expect(screen.getByText('Which game is this character for?')).toBeTruthy()
  expect(screen.getByText('D&D 5e (2024)')).toBeTruthy()
  fireEvent.press(screen.getByText('Daggerheart'))
  expect(useBuilderStore.getState().systemId).toBe('daggerheart')
  expect(mockRouter.replace).toHaveBeenCalledWith('/(app)/characters/new/heritage')
})
