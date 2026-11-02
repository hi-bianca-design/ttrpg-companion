import { fireEvent, render, screen } from '@testing-library/react-native'
import NewCharacterScreen from '../../app/(app)/characters/new'
import { useBuilderStore } from '@/features/characters/builder/builder.store'

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

beforeEach(() => {
  jest.clearAllMocks()
  useBuilderStore.getState().reset()
})

test('with D&D and Daggerheart visible, New character asks which game first', () => {
  render(<NewCharacterScreen />)
  expect(mockRedirect).not.toHaveBeenCalled()
  expect(screen.getByText('Which game is this character for?')).toBeTruthy()
  expect(screen.getByText('D&D 5e (2024)')).toBeTruthy()
  fireEvent.press(screen.getByText('Daggerheart'))
  expect(useBuilderStore.getState().systemId).toBe('daggerheart')
  expect(mockRouter.replace).toHaveBeenCalledWith('/(app)/characters/new/heritage')
})
