import fs from 'fs'
import path from 'path'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { SheetHeader } from '@/features/characters/sheet/SheetHeader'
import { useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useActiveSession } from '@/features/sessions/sessions.queries'

jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCharacterCampaign: jest.fn() }))
jest.mock('@/features/sessions/sessions.queries', () => ({ useActiveSession: jest.fn() }))
const mockRouter = { dismiss: jest.fn(), replace: jest.fn(), canDismiss: jest.fn(() => true) }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({ id: 'ch1' }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: { id: 'camp1' }, isLoading: false, isError: false })
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: { id: 's1' }, isError: false })
})

test('the shared sheet header shows Session: Active while the campaign has a session', () => {
  render(<SheetHeader name="Mira" eyebrow="Your character" onLevelUp={jest.fn()} />)
  expect(screen.getByText('Session: Active')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Level up' })).toBeTruthy()
})

test('no badge without an active session, and Back still works', () => {
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: null, isError: false })
  render(<SheetHeader name="Mira" />)
  expect(screen.queryByText('Session: Active')).toBeNull()
  fireEvent.press(screen.getByRole('button', { name: 'Back' }))
  expect(mockRouter.dismiss).toHaveBeenCalled()
})

test('a failing session query leaves the header intact', () => {
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: undefined, isError: true })
  render(<SheetHeader name="Mira" />)
  expect(screen.queryByText('Session: Active')).toBeNull()
  expect(screen.getByText('Mira')).toBeTruthy()
})

test.each(['index', 'actions', 'inventory', 'campaign'])('the %s tab uses the shared SheetHeader', (tab) => {
  const file = path.join(__dirname, '../../../app/(app)/characters/[id]', `${tab}.tsx`)
  expect(fs.readFileSync(file, 'utf8')).toMatch(/<SheetHeader\b/)
})
