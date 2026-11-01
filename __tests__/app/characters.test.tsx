import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen } from '@testing-library/react-native'
import CharactersScreen from '../../app/(app)/characters/index'
import { useCharacters, useDeleteCharacter } from '@/features/characters/characters.queries'

jest.mock('@/features/characters/characters.queries', () => ({
  useCharacters: jest.fn(),
  useDeleteCharacter: jest.fn(),
}))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/components/game', () => ({
  ScreenBackground: ({ children }: { children: React.ReactNode }) => children,
}))

const mockMutate = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useCharacters as jest.Mock).mockReturnValue({
    data: [{ id: 'ch1', name: 'Mira', level: 1, system_id: 'dnd5e-2024', class_name: 'Wizard', hp: { current: 8, max: 8 } }],
    isLoading: false, isError: false, refetch: jest.fn(),
  })
  ;(useDeleteCharacter as jest.Mock).mockReturnValue({ mutate: mockMutate, isPending: false })
})

function renderList() {
  return render(<><CharactersScreen /><PortalHost /></>)
}

test('the card hints that a long press deletes', () => {
  renderList()
  expect(screen.getByRole('button', { name: 'Mira, Level 1 Wizard' })).toHaveProp('accessibilityHint', 'Long press to delete')
})

test('long press → confirm Delete calls the delete mutation with the id', () => {
  renderList()
  fireEvent(screen.getByRole('button', { name: 'Mira, Level 1 Wizard' }), 'longPress')
  expect(screen.getByText('Delete Mira?')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Delete' }))
  expect(mockMutate).toHaveBeenCalledWith('ch1', expect.anything())
})

test('long press → Cancel does not delete', () => {
  renderList()
  fireEvent(screen.getByRole('button', { name: 'Mira, Level 1 Wizard' }), 'longPress')
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
  expect(mockMutate).not.toHaveBeenCalled()
  expect(screen.queryByText('Delete Mira?')).toBeNull()
})
