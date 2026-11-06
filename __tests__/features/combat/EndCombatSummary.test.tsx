import 'react-native-gesture-handler/jestSetup'
import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { PortalHost } from '@rn-primitives/portal'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { getCombatEntries, type CombatEntry } from '@/features/combat/combat.api'
import { EndCombatSummary } from '@/features/combat/EndCombatSummary'
import { EndCombatSummaryHost } from '@/features/combat/EndCombatSummaryHost'
import { GmCombatScreen } from '@/features/combat/GmCombatScreen'
import { dismissEndSummary, showEndSummary } from '@/features/combat/endCombatSummaryStore'
import { useSetCombat } from '@/features/sessions/sessions.queries'
import { showToast } from '@/components/ui/toast'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { character, combat, enemy, entry } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/features/sessions/sessions.queries', () => ({ useSetCombat: jest.fn() }))
jest.mock('@/features/content/content.api', () => ({ listContent: jest.fn().mockResolvedValue([]) }))
jest.mock('@/features/encounters/encounters.api', () => ({ listEncounters: jest.fn().mockResolvedValue([]) }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

jest.setTimeout(30000)

const mutateAsync = jest.fn()
const campaign = { id: 'camp1', gm_id: 'gm', system_id: 'dnd5e-2024', members: [] } as never
const party = [character('c1', 'Mira')]
let client: QueryClient

function setEntries(list: CombatEntry[]) {
  ;(getCombatEntries as jest.Mock).mockResolvedValue(list)
}
const players = [entry({ id: 'p1', user_id: 'u1', character_id: 'c1', position: 1, initiative: 18, is_current: true })]

function screenUi() {
  return (
    <QueryClientProvider client={client}>
      <GmCombatScreen campaign={campaign} combat={combat({ round: 4 })} party={party} />
      <EndCombatSummaryHost campaignId="camp1" />
      <PortalHost />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  act(() => dismissEndSummary())
  client = makeTestQueryClient()
  mutateAsync.mockResolvedValue({})
  ;(useSetCombat as jest.Mock).mockReturnValue({ mutateAsync })
})

describe('EndCombatSummary', () => {
  test('shows the rounds fought and the XP earned', () => {
    render(<EndCombatSummary round={5} xp={750} onClose={jest.fn()} />)
    expect(screen.getByText('Rounds fought: 5')).toBeTruthy()
    expect(screen.getByText('XP earned: 750')).toBeTruthy()
  })

  test('has no XP line when xp is null', () => {
    render(<EndCombatSummary round={2} xp={null} onClose={jest.fn()} />)
    expect(screen.getByText('Rounds fought: 2')).toBeTruthy()
    expect(screen.queryByText(/XP earned/)).toBeNull()
  })

  test('Close calls onClose and is a 44pt target', () => {
    const onClose = jest.fn()
    render(<EndCombatSummary round={1} xp={null} onClose={onClose} />)
    fireEvent.press(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('All enemies down prompt', () => {
  test('appears when every enemy is at 0 HP and does not end combat by itself', async () => {
    setEntries([...players, enemy({ id: 'g1', hp: 0 }), enemy({ id: 'g2', hp: 0 })])
    render(screenUi())
    expect(await screen.findByText('All enemies down. End combat?')).toBeTruthy()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  test('is absent while an enemy is still up', async () => {
    setEntries([...players, enemy({ id: 'g1', name: 'Goblin', hp: 0 }), enemy({ id: 'g2', name: 'Ogre', hp: 3 })])
    render(screenUi())
    await screen.findAllByText('Ogre')
    expect(screen.queryByText('All enemies down. End combat?')).toBeNull()
  })

  test('is absent with no enemies', async () => {
    setEntries(players)
    render(screenUi())
    await screen.findByText('No enemies yet')
    expect(screen.queryByText('All enemies down. End combat?')).toBeNull()
  })

  test('can be dismissed without ending combat', async () => {
    setEntries([...players, enemy({ id: 'g1', hp: 0 })])
    render(screenUi())
    await screen.findByText('All enemies down. End combat?')
    fireEvent.press(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByText('All enemies down. End combat?')).toBeNull()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  test('ending calls setCombat(false) once, then shows the summary with the captured round and XP', async () => {
    setEntries([...players, enemy({ id: 'g1', hp: 0, xp: 200 }), enemy({ id: 'g2', hp: 0, xp: 50 })])
    render(screenUi())
    await screen.findByText('All enemies down. End combat?')
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'End combat' }))
    })
    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutateAsync).toHaveBeenCalledWith({ sessionId: 's1', inCombat: false })
    expect(await screen.findByText('Rounds fought: 4')).toBeTruthy()
    // the screen's own header says the same until it unmounts, so the summary makes it two
    expect(screen.getAllByText('XP earned: 250')).toHaveLength(2)
  })

  test('a refused end toasts and shows no summary', async () => {
    mutateAsync.mockRejectedValue(new Error('nope'))
    setEntries([...players, enemy({ id: 'g1', hp: 0 })])
    render(screenUi())
    await screen.findByText('All enemies down. End combat?')
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'End combat' }))
    })
    expect(showToast).toHaveBeenCalledWith('nope')
    expect(screen.queryByText(/Rounds fought/)).toBeNull()
  })
})

describe('EndCombatSummaryHost', () => {
  test('shows a summary for its campaign and Close dismisses it', async () => {
    render(<><EndCombatSummaryHost campaignId="camp9" /><PortalHost /></>)
    expect(screen.queryByText(/Rounds fought/)).toBeNull()
    act(() => showEndSummary('other', { round: 1, xp: null }))
    expect(screen.queryByText(/Rounds fought/)).toBeNull()
    act(() => showEndSummary('camp9', { round: 3, xp: null }))
    expect(await screen.findByText('Rounds fought: 3')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByText(/Rounds fought/)).toBeNull())
  })
})
