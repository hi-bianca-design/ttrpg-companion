import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../../../helpers/queryClient'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import InventoryTab from '../../../../app/(app)/characters/[id]/inventory'
import type { CharacterFull } from '@/features/characters/characters.api'
import * as charApi from '@/features/characters/characters.api'
import { listContent } from '@/features/content/content.api'
import { getCharacterCampaign } from '@/features/campaigns/campaigns.api'
import { showToast } from '@/components/ui/toast'
import { variantOf } from '../../../helpers/button'
import { ShapedSurface } from '@/components/ui/shaped-surface'

jest.mock('@/features/characters/characters.api', () => ({
  getCharacter: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
}))
jest.mock('@/features/content/content.api', () => ({ listContent: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.api', () => ({ getCharacterCampaign: jest.fn() }))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({ id: 'ch1' }),
  useRouter: () => mockRouter,
}))
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismiss: jest.fn(), canDismiss: jest.fn(() => true) }
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))
jest.mock('@/components/game/ScreenBackground', () => ({
  ScreenBackground: ({ children }: { children: React.ReactNode }) => children,
}))

const row = (id: string, kind: string, name: string, data: Record<string, unknown> = {}) =>
  ({ id, kind, name, data, slug: id, system_id: 'dnd5e-2024', owner_id: null, campaign_id: null }) as never

const CATALOG = [
  row('c-rope', 'item', 'Rope', { category: 'Adventuring Gear' }),
  row('c-silk', 'item', 'Silk Rope', { category: 'Adventuring Gear' }),
  row('c-torch', 'item', 'Torch', { category: 'Adventuring Gear' }),
  row('c-rod', 'magic_item', 'Rod of Alertness', { rarity: 'Very Rare', requires_attunement: true }),
]

const owned = (id: string, name: string, attuned: boolean, requires = true, extra: Record<string, unknown> = {}) => ({
  id, character_id: 'ch1', content_id: `c-${id}`, quantity: 1, equipped: false, attuned, notes: null, created_at: '2026-01-01', ...extra,
  content: row(`c-${id}`, 'magic_item', name, { requires_attunement: requires, rarity: 'Rare' }),
}) as never

function character(items: unknown[]): CharacterFull {
  return {
    id: 'ch1', system_id: 'dnd5e-2024', name: 'Mira', level: 3, stats: {}, conditions: [], details: {},
    resources: {}, owner_id: 'u', notes: null, portrait_url: null, derived: [], picks: [], items,
  } as unknown as CharacterFull
}

let client: ReturnType<typeof makeTestQueryClient>

function setup(c: CharacterFull) {
  ;(charApi.getCharacter as jest.Mock).mockResolvedValue(c)
  client = makeTestQueryClient()
  return render(
    <QueryClientProvider client={client}>
      <InventoryTab />
      <PortalHost />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  client?.clear()
})

beforeEach(() => {
  jest.clearAllMocks()
  ;(listContent as jest.Mock).mockImplementation(async ({ kind, search }: { kind: string; search?: string }) =>
    CATALOG.filter((r) => (r as { kind: string }).kind === kind && (!search || (r as { name: string }).name.toLowerCase().includes(search.toLowerCase()))))
  ;(getCharacterCampaign as jest.Mock).mockResolvedValue(null)
  ;(charApi.addItem as jest.Mock).mockResolvedValue(undefined)
  ;(charApi.updateItem as jest.Mock).mockResolvedValue(undefined)
  ;(charApi.removeItem as jest.Mock).mockResolvedValue(undefined)
})

test('searching "rope" in the picker shows only matching items', async () => {
  setup(character([]))
  fireEvent.press(await screen.findByRole('button', { name: 'Add item' }))
  expect(await screen.findByRole('button', { name: 'Torch' })).toBeTruthy()
  fireEvent.changeText(screen.getByLabelText('Search items'), 'rope')
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Torch' })).toBeNull())
  expect(screen.getByRole('button', { name: 'Rope' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Silk Rope' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Rod of Alertness' })).toBeNull()
})

test('adding with quantity 3 calls addItem(characterId, contentId, 3)', async () => {
  setup(character([]))
  fireEvent.press(await screen.findByRole('button', { name: 'Add item' }))
  fireEvent.press(await screen.findByRole('button', { name: 'Rope' }))
  fireEvent.press(screen.getByRole('button', { name: 'Increase quantity' }))
  fireEvent.press(screen.getByRole('button', { name: 'Increase quantity' }))
  fireEvent.press(screen.getByRole('button', { name: 'Add to inventory' }))
  await waitFor(() => expect(charApi.addItem).toHaveBeenCalledWith('ch1', 'c-rope', 3))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith('Added Rope ×3.'))
})

test('the source chips hide the campaign chip when the character has no campaign', async () => {
  setup(character([]))
  fireEvent.press(await screen.findByRole('button', { name: 'Add item' }))
  expect(await screen.findByRole('button', { name: 'SRD' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'My homebrew' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Greywatch' })).toBeNull()
})

test('a campaign chip appears and scopes the search to that campaign', async () => {
  ;(getCharacterCampaign as jest.Mock).mockResolvedValue({ id: 'camp1', name: 'Greywatch' })
  setup(character([]))
  fireEvent.press(await screen.findByRole('button', { name: 'Add item' }))
  fireEvent.press(await screen.findByRole('button', { name: 'Greywatch' }))
  await waitFor(() => expect(listContent).toHaveBeenCalledWith(expect.objectContaining({ scope: { campaignId: 'camp1' } })))
})

test('the fourth attunement toggle is disabled with a caption at the limit', async () => {
  setup(character([owned('a', 'Ring A', true), owned('b', 'Ring B', true), owned('c', 'Ring C', true), owned('d', 'Ring D', false)]))
  const fourth = await screen.findByRole('button', { name: 'Attune Ring D' })
  expect(fourth).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Unattune Ring A' })).not.toBeDisabled()
  expect(screen.getByText(/Attunement limit reached \(3 of 3\)/)).toBeTruthy()
})

test('attunement stays available below the limit and writes through updateItem', async () => {
  setup(character([owned('a', 'Ring A', true), owned('d', 'Ring D', false)]))
  const toggle = await screen.findByRole('button', { name: 'Attune Ring D' })
  expect(toggle).not.toBeDisabled()
  fireEvent.press(toggle)
  await waitFor(() => expect(charApi.updateItem).toHaveBeenCalledWith('d', { attuned: true }))
})

test('removing an item asks for confirmation first', async () => {
  setup(character([owned('a', 'Ring A', false)]))
  fireEvent.press(await screen.findByRole('button', { name: 'Remove Ring A' }))
  expect(charApi.removeItem).not.toHaveBeenCalled()
  await screen.findByText('Remove item?')
  // The dialog renders after the list, so its confirm button is the last "Remove".
  fireEvent.press(screen.getAllByRole('button', { name: 'Remove' }).at(-1)!)
  await waitFor(() => expect(charApi.removeItem).toHaveBeenCalledWith('a'))
})

test('a failed write shows a caption', async () => {
  ;(charApi.updateItem as jest.Mock).mockRejectedValue(new Error('Something went wrong. Please try again.'))
  setup(character([owned('a', 'Ring A', false)]))
  fireEvent.press(await screen.findByRole('button', { name: 'Equip Ring A' }))
  expect(await screen.findByText('Something went wrong. Please try again.')).toBeTruthy()
})

test('the picker renders every result, not just the first few', async () => {
  const many = Array.from({ length: 12 }, (_, i) => row(`c-m${i}`, 'item', `Marble ${i}`))
  ;(listContent as jest.Mock).mockImplementation(async ({ kind }: { kind: string }) => (kind === 'item' ? many : []))
  setup(character([]))
  fireEvent.press(await screen.findByRole('button', { name: 'Add item' }))
  expect(await screen.findByRole('button', { name: 'Marble 11' })).toBeTruthy()
  expect(screen.getAllByRole('button', { name: /^Marble / })).toHaveLength(12)
})

test('a failed add shows the error inside the sheet and keeps it open', async () => {
  ;(charApi.addItem as jest.Mock).mockRejectedValue(new Error('Could not add that item.'))
  setup(character([]))
  fireEvent.press(await screen.findByRole('button', { name: 'Add item' }))
  fireEvent.press(await screen.findByRole('button', { name: 'Rope' }))
  fireEvent.press(screen.getByRole('button', { name: 'Add to inventory' }))
  // The caption must live in the same container as the primary button (the sheet), not on the screen behind it.
  const caption = await screen.findByText('Could not add that item.')
  let box = caption.parent
  while (box && !within(box).queryByRole('button', { name: 'Add to inventory' })) box = box.parent
  expect(box).toBeTruthy()
  expect(within(box!).queryByText('Mira')).toBeNull()
})

test('a failed remove shows a caption', async () => {
  ;(charApi.removeItem as jest.Mock).mockRejectedValue(new Error('Could not remove that item.'))
  setup(character([owned('a', 'Ring A', false)]))
  fireEvent.press(await screen.findByRole('button', { name: 'Remove Ring A' }))
  await screen.findByText('Remove item?')
  fireEvent.press(screen.getAllByRole('button', { name: 'Remove' }).at(-1)!)
  expect(await screen.findByText('Could not remove that item.')).toBeTruthy()
})

test('a second quantity tap is blocked while the first write is pending (no lost increments)', async () => {
  let resolve!: () => void
  ;(charApi.updateItem as jest.Mock).mockImplementation(() => new Promise<void>((r) => { resolve = r }))
  setup(character([owned('a', 'Ring A', false)]))
  const plus = await screen.findByRole('button', { name: 'Increase Ring A quantity' })
  fireEvent.press(plus)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Increase Ring A quantity' })).toBeDisabled())
  fireEvent.press(screen.getByRole('button', { name: 'Increase Ring A quantity' }))
  expect(charApi.updateItem).toHaveBeenCalledTimes(1)
  expect(charApi.updateItem).toHaveBeenCalledWith('a', { quantity: 2 })
  resolve()
})

test('shared header with the character name and caret Back', async () => {
  setup(character([owned('a', 'Ring A', false)]))
  expect(await screen.findByText('Mira')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Back' }))
  expect(mockRouter.dismiss).toHaveBeenCalled()
})

test('rows keep a stable order (created_at, then name) whatever the server returns', async () => {
  setup(character([
    owned('z', 'Wand', false, false, { created_at: '2026-01-03', equipped: true }),
    owned('b', 'Boots', false, false, { created_at: '2026-01-02' }),
    owned('a', 'Amulet', false, false, { created_at: '2026-01-02' }),
  ]))
  await screen.findByText('Wand')
  const json = JSON.stringify(screen.toJSON())
  expect(json.indexOf('Amulet')).toBeLessThan(json.indexOf('Boots'))
  expect(json.indexOf('Boots')).toBeLessThan(json.indexOf('Wand'))
})

test('controls live inside the item card; equip/attune are outline toggles; no duplicate state tags', async () => {
  setup(character([owned('a', 'Ring A', true, true, { equipped: true })]))
  const equip = await screen.findByRole('button', { name: 'Unequip Ring A' })
  expect(equip.props.accessibilityState).toMatchObject({ selected: true })
  expect(variantOf(equip)).not.toBe('primary')
  expect(screen.queryByText('EQUIPPED')).toBeNull()
  // the Remove control shares the card container with the title
  let box = screen.getByRole('button', { name: 'Remove Ring A' }).parent
  while (box && box.type !== ShapedSurface) box = box.parent
  expect(box).toBeTruthy()
  expect(within(box!).getByText('Ring A')).toBeTruthy()
})

test('Remove uses the destructive tone', async () => {
  setup(character([owned('a', 'Ring A', false)]))
  const remove = await screen.findByRole('button', { name: 'Remove Ring A' })
  expect(within(remove).getByText('Remove').props.className).toContain('text-destructive')
})
