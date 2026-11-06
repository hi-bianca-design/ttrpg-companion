import 'react-native-gesture-handler/jestSetup'
import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import { startPreparedCombat } from '@/features/combat/combat.api'
import { EncounterPicker } from '@/features/combat/EncounterPicker'
import { ReviewScreen } from '@/features/combat/ReviewScreen'
import type { Encounter } from '@/features/encounters/encounters.api'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { character } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const launch = startPreparedCombat as jest.Mock
const party = [character('c1', 'Mira'), character('c2', 'Bram')]
const campaign = { id: 'camp1', gm_id: 'gm', members: [] } as never

function enemyRow(id: string, name: string, count = 1, hidden = false, position = 0) {
  return { id, name, count, hidden, position, max_hp: 21, ac: 17, xp: 200, encounter_id: 'x', campaign_id: 'camp1', attacks: [], defense_label: null, notes: null }
}
function encounter(id: string, name: string, enemies: ReturnType<typeof enemyRow>[], story: [string | null, string | null, string | null] = [null, null, null]) {
  return {
    id, name, campaign_id: 'camp1', created_at: '', updated_at: '',
    story_before: story[0], story_why: story[1], story_after: story[2], enemies,
  } as unknown as Encounter
}
const ambush = encounter('e1', 'Goblin Ambush', [enemyRow('b1', 'Goblin Boss'), enemyRow('w1', 'Wolf', 2, true, 1)],
  ['The party followed the tracks.', 'The goblins guard the map.', 'The map leads to the cave.'])
const bare = encounter('e2', 'Quiet Camp', [enemyRow('r1', 'Rat')])

let client: QueryClient
function setup(props: { initialEncounterId?: string; onBack?: () => void; encounters?: Encounter[] } = {}) {
  client = makeTestQueryClient()
  client.setQueryData(qk.encounters('camp1'), props.encounters ?? [ambush, bare])
  return render(
    <QueryClientProvider client={client}>
      <ReviewScreen
        campaign={campaign}
        party={party}
        sessionId="s1"
        initialEncounterId={props.initialEncounterId}
        onBack={props.onBack ?? jest.fn()}
      />
      <PortalHost />
    </QueryClientProvider>,
  )
}
const names = () => screen.getAllByTestId(/^draft-/).map((n) => n.props.testID)

beforeEach(() => {
  jest.clearAllMocks()
  launch.mockResolvedValue({})
})

test('a pre-selected encounter shows its three story notes under its name and its enemies', () => {
  setup({ initialEncounterId: 'e1' })
  expect(within(screen.getByTestId('story-panel')).getByText('Goblin Ambush')).toBeTruthy()
  expect(screen.getByText('The party followed the tracks.')).toBeTruthy()
  expect(screen.getByText('The goblins guard the map.')).toBeTruthy()
  expect(screen.getByText('The map leads to the cave.')).toBeTruthy()
  expect(names()).toEqual(['draft-player:c1', 'draft-player:c2', 'draft-enemy:b1:1', 'draft-enemy:w1:1', 'draft-enemy:w1:2'])
  expect(screen.getByLabelText('Enemy preview: Wolf ×2')).toBeTruthy()
})

test('an encounter with no notes renders no story panel', () => {
  setup({ initialEncounterId: 'e2' })
  expect(screen.queryByTestId('story-panel')).toBeNull()
  expect(screen.queryByText('Story')).toBeNull()
  expect(names()).toContain('draft-enemy:r1:1')
})

test('only the non-empty notes are shown', () => {
  setup({ initialEncounterId: 'e1', encounters: [encounter('e1', 'Goblin Ambush', [], [null, 'Because of the map.', ''])] })
  expect(screen.getByText('Because of the map.')).toBeTruthy()
  expect(screen.queryByText('How they got here')).toBeNull()
  expect(screen.queryByText('What happens after')).toBeNull()
})

test('Move down reorders the list', () => {
  setup({ initialEncounterId: 'e1' })
  fireEvent.press(screen.getByRole('button', { name: 'Move down: Goblin Boss' }))
  expect(names()).toEqual(['draft-player:c1', 'draft-player:c2', 'draft-enemy:w1:1', 'draft-enemy:b1:1', 'draft-enemy:w1:2'])
})

test('the ends of the list cannot be moved off it', () => {
  setup({ initialEncounterId: 'e1' })
  expect(screen.getByRole('button', { name: 'Move up: Mira' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Move down: Wolf 2' })).toBeDisabled()
})

test('Back calls onBack and never launches', () => {
  const onBack = jest.fn()
  setup({ initialEncounterId: 'e1', onBack })
  fireEvent.press(screen.getByRole('button', { name: 'Back' }))
  expect(onBack).toHaveBeenCalledTimes(1)
  expect(launch).not.toHaveBeenCalled()
})

test('Enter combat launches once with the order and hidden keys, even if tapped twice', async () => {
  setup({ initialEncounterId: 'e1' })
  fireEvent.press(screen.getByRole('button', { name: 'Move down: Goblin Boss' }))
  fireEvent.press(screen.getByRole('button', { name: 'Enter combat' }))
  fireEvent.press(screen.getByRole('button', { name: 'Enter combat' }))
  await waitFor(() => expect(launch).toHaveBeenCalledTimes(1))
  expect(launch).toHaveBeenCalledWith('s1', {
    encounterIds: ['e1'],
    order: ['player:c1', 'player:c2', 'enemy:w1:1', 'enemy:b1:1', 'enemy:w1:2'],
    hiddenKeys: ['enemy:w1:1', 'enemy:w1:2'],
  })
})

test('the Hidden toggle flips an enemy and is sent on launch; players have none', async () => {
  setup({ initialEncounterId: 'e1' })
  const boss = screen.getByTestId('draft-enemy:b1:1')
  const toggle = within(boss).getByRole('button', { name: 'Hidden: Goblin Boss' })
  expect(toggle).toHaveAccessibilityState({ selected: false })
  fireEvent.press(toggle)
  expect(within(boss).getByRole('button', { name: 'Hidden: Goblin Boss' })).toHaveAccessibilityState({ selected: true })
  expect(within(screen.getByTestId('draft-player:c1')).queryByRole('button', { name: /^Hidden/ })).toBeNull()
  fireEvent.press(screen.getByRole('button', { name: 'Enter combat' }))
  await waitFor(() => expect(launch).toHaveBeenCalled())
  expect(launch.mock.calls[0][1].hiddenKeys).toEqual(['enemy:b1:1', 'enemy:w1:1', 'enemy:w1:2'])
})

test('Enter combat with no encounter launches a party-only draft', async () => {
  setup()
  fireEvent.press(screen.getByRole('button', { name: 'Enter combat' }))
  await waitFor(() => expect(launch).toHaveBeenCalledWith('s1', { encounterIds: [], order: ['player:c1', 'player:c2'], hiddenKeys: [] }))
})

test('the GM can add an encounter while reviewing; it joins at the end and cannot be added twice', async () => {
  setup({ initialEncounterId: 'e1' })
  fireEvent.press(screen.getByRole('button', { name: 'Add encounter' }))
  expect(screen.getByRole('button', { name: 'Goblin Ambush, already added' })).toBeDisabled()
  fireEvent.press(screen.getByRole('button', { name: 'Quiet Camp' }))
  expect(names().at(-1)).toBe('draft-enemy:r1:1')
  fireEvent.press(screen.getByRole('button', { name: 'Enter combat' }))
  await waitFor(() => expect(launch).toHaveBeenCalled())
  expect(launch.mock.calls[0][1].encounterIds).toEqual(['e1', 'e2'])
})

test('a failing launch toasts the error copy and stays on the screen, and can be retried', async () => {
  launch.mockRejectedValueOnce(new AppError('not_rolling'))
  setup({ initialEncounterId: 'e1' })
  fireEvent.press(screen.getByRole('button', { name: 'Enter combat' }))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.not_rolling))
  expect(screen.getByRole('button', { name: 'Enter combat' })).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Enter combat' }))
  await waitFor(() => expect(launch).toHaveBeenCalledTimes(2))
})

test('nothing labelled Initiative for <name> exists', () => {
  setup({ initialEncounterId: 'e1' })
  expect(screen.queryAllByLabelText(/^Initiative for/)).toHaveLength(0)
})

describe('EncounterPicker', () => {
  test('lists encounters and reports the pick', () => {
    const onPick = jest.fn()
    render(<EncounterPicker encounters={[ambush, bare]} onPick={onPick} />)
    fireEvent.press(screen.getByRole('button', { name: 'Quiet Camp' }))
    expect(onPick).toHaveBeenCalledWith('e2')
  })

  test('empty state points at preparing encounters', () => {
    render(<EncounterPicker encounters={[]} onPick={jest.fn()} />)
    expect(screen.getByText('No encounters yet')).toBeTruthy()
  })
})
