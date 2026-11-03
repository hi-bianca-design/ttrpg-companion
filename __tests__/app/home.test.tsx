import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import HomeScreen from '../../app/(app)/index'
import { useHomeData } from '@/features/home/useHomeData'

const mockRouter = { push: jest.fn() }
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))
jest.mock('@/features/home/useHomeData', () => ({ useHomeData: jest.fn() }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }))
jest.mock('@/components/game', () => ({
  ScreenBackground: ({ children }: { children: React.ReactNode }) => children,
  EmptyState: ({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) => {
    const { Text, Pressable } = require('react-native')
    return <><Text>{title}</Text>{actionLabel ? <Pressable role="button" accessibilityLabel={actionLabel} onPress={onAction} /> : null}</>
  },
}))

const ch = { id: 'ch1', name: 'Brannoch', level: 3, class_name: 'Cleric', system_id: 'dnd5e-2024', hp: null }
const camp = { id: 'c1', name: 'Ember Hollow', gm_id: 'gm', system_id: 'dnd5e-2024', member_count: 3 }
const data = (over = {}) => ({ characters: [ch], campaigns: [camp], sessions: {}, isLoading: false, isError: false, refetch: jest.fn(), ...over })

beforeEach(() => { jest.clearAllMocks() })

test('your turn tops Home with an Open turn action into that campaign', () => {
  ;(useHomeData as jest.Mock).mockReturnValue(data({ sessions: { c1: { in_combat: true, current_turn_user_id: 'me' } } }))
  render(<HomeScreen />)
  expect(screen.getByText('Your turn')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Open turn' }))
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/campaigns/[id]', params: { id: 'c1' } })
})

test('with nothing live the card picks up the latest character', () => {
  ;(useHomeData as jest.Mock).mockReturnValue(data())
  render(<HomeScreen />)
  fireEvent.press(screen.getByRole('button', { name: 'Open character' }))
  expect(mockRouter.push).toHaveBeenCalledWith('/(app)/characters/ch1')
})

test('lists show characters and campaigns, and a live campaign carries a LIVE badge', () => {
  ;(useHomeData as jest.Mock).mockReturnValue(data({ sessions: { c1: { in_combat: false, current_turn_user_id: null } } }))
  render(<HomeScreen />)
  expect(screen.getByRole('button', { name: 'Brannoch, Level 3 Cleric' })).toBeTruthy()
  expect(screen.getAllByText('Live').length).toBeGreaterThan(0)
  fireEvent.press(screen.getByRole('button', { name: 'Ember Hollow' }))
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/campaigns/[id]', params: { id: 'c1' } })
})

test('a new account sees both empty states with their actions', () => {
  ;(useHomeData as jest.Mock).mockReturnValue(data({ characters: [], campaigns: [] }))
  render(<HomeScreen />)
  expect(screen.getByText('No characters yet')).toBeTruthy()
  expect(screen.getByText('No campaigns yet')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Create character' }))
  expect(mockRouter.push).toHaveBeenCalledWith('/(app)/characters/new')
  fireEvent.press(screen.getByRole('button', { name: 'Find a campaign' }))
  expect(mockRouter.push).toHaveBeenCalledWith('/(app)/campaigns')
})

test('a campaign whose session has not loaded (or failed) still renders with everything else', () => {
  ;(useHomeData as jest.Mock).mockReturnValue(data({ sessions: { c1: undefined } }))
  render(<HomeScreen />)
  expect(screen.getByRole('button', { name: 'Ember Hollow' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Brannoch, Level 3 Cleric' })).toBeTruthy()
  expect(screen.queryByText('Live')).toBeNull()
})

test('a failed load offers Try again', () => {
  const refetch = jest.fn()
  ;(useHomeData as jest.Mock).mockReturnValue(data({ isError: true, characters: [], campaigns: [], refetch }))
  render(<HomeScreen />)
  fireEvent.press(screen.getByRole('button', { name: 'Try again' }))
  expect(refetch).toHaveBeenCalled()
})
