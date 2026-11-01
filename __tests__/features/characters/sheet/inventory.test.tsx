import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import InventoryTab from '../../../../app/(app)/characters/[id]/inventory'
import type { CharacterFull } from '@/features/characters/characters.api'
import * as charApi from '@/features/characters/characters.api'
import { listContent } from '@/features/content/content.api'
import { getCharacterCampaign } from '@/features/campaigns/campaigns.api'

jest.mock('@/features/characters/characters.api', () => ({
  getCharacter: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
}))
jest.mock('@/features/content/content.api', () => ({ listContent: jest.fn() }))
jest.mock('@/features/campaigns/campaigns.api', () => ({ getCharacterCampaign: jest.fn() }))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'ch1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}))
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

const owned = (id: string, name: string, attuned: boolean, requires = true) => ({
  id, character_id: 'ch1', content_id: `c-${id}`, quantity: 1, equipped: false, attuned, notes: null,
  content: row(`c-${id}`, 'magic_item', name, { requires_attunement: requires, rarity: 'Rare' }),
}) as never

function character(items: unknown[]): CharacterFull {
  return {
    id: 'ch1', system_id: 'dnd5e-2024', name: 'Mira', level: 3, stats: {}, conditions: [], details: {},
    resources: {}, owner_id: 'u', notes: null, portrait_url: null, derived: [], picks: [], items,
  } as unknown as CharacterFull
}

let client: QueryClient

function setup(c: CharacterFull) {
  ;(charApi.getCharacter as jest.Mock).mockResolvedValue(c)
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } })
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
