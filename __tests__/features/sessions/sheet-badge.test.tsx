import fs from 'fs'
import path from 'path'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { SheetHeader } from '@/features/characters/sheet/SheetHeader'
import { useCampaign, useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useActiveSession, useSetCombat } from '@/features/sessions/sessions.queries'
import { useCharacter } from '@/features/characters/characters.queries'
import { useActiveCombat, useCombatOrder } from '@/features/combat/combat.queries'

jest.mock('@/features/campaigns/campaigns.queries', () => ({ useCharacterCampaign: jest.fn(), useCampaign: jest.fn() }))
jest.mock('@/features/sessions/sessions.queries', () => ({ useActiveSession: jest.fn(), useSetCombat: jest.fn() }))
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.queries', () => ({ useActiveCombat: jest.fn(), useCombatOrder: jest.fn(), useEndMyTurn: () => ({ mutateAsync: jest.fn(), isPending: false }) }))
jest.mock('@/features/combat/useCombatRealtime', () => ({ useCombatRealtime: () => ({ connected: true }) }))
jest.mock('@/features/characters/characters.queries', () => ({ useCharacter: jest.fn() }))
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'gm1' } }) }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
const mockRouter = { dismiss: jest.fn(), replace: jest.fn(), canDismiss: jest.fn(() => true) }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({ id: 'ch1' }),
}))

const outOfCombat = { id: 's1', campaign_id: 'camp1', in_combat: false, combat_started_by: null }

beforeEach(() => {
  jest.clearAllMocks()
  ;(useCharacterCampaign as jest.Mock).mockReturnValue({ data: { id: 'camp1' }, isLoading: false, isError: false })
  ;(useCampaign as jest.Mock).mockReturnValue({ data: { id: 'camp1', gm_id: 'gm1' } })
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: outOfCombat, isError: false })
  ;(useSetCombat as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() })
  ;(useCharacter as jest.Mock).mockReturnValue({ data: { id: 'ch1', owner_id: 'gm1' } })
  ;(useActiveCombat as jest.Mock).mockReturnValue({ data: null })
  ;(useCombatOrder as jest.Mock).mockReturnValue({ data: [] })
})

test('the shared sheet header shows Session: Active and Enter combat while the campaign has a session', () => {
  render(<SheetHeader name="Mira" eyebrow="Your character" onLevelUp={jest.fn()} />)
  expect(screen.getByText('Session: Active')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Enter combat' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Level up' })).toBeTruthy()
})

test('in combat the header shows In combat instead of Enter combat', () => {
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: { ...outOfCombat, in_combat: true, combat_started_by: 'p1' }, isError: false })
  render(<SheetHeader name="Mira" />)
  expect(screen.getByText('Session: Active')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'In combat' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Enter combat' })).toBeNull()
})

test('the holder sees the Your turn banner in the header; nobody else does', () => {
  const rows = [{ id: 'e1', user_id: 'gm1', character_id: 'ch1', position: 1 }, { id: 'e2', user_id: 'p2', character_id: 'ch2', position: 2 }]
  ;(useCombatOrder as jest.Mock).mockReturnValue({ data: rows })
  ;(useActiveCombat as jest.Mock).mockReturnValue({ data: { id: 'cb1', status: 'active', turn_entry_id: 'e1' } })
  const { unmount } = render(<SheetHeader name="Mira" />)
  expect(screen.getByText('Your turn')).toBeTruthy()
  unmount()
  ;(useActiveCombat as jest.Mock).mockReturnValue({ data: { id: 'cb1', status: 'active', turn_entry_id: 'e2' } })
  render(<SheetHeader name="Mira" />)
  expect(screen.queryByText('Your turn')).toBeNull()
})

test('no badges without an active session, and Back still works', () => {
  ;(useActiveSession as jest.Mock).mockReturnValue({ data: null, isError: false })
  render(<SheetHeader name="Mira" />)
  expect(screen.queryByText('Session: Active')).toBeNull()
  expect(screen.queryByText('Enter combat')).toBeNull()
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
