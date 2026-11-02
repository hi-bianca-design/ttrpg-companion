import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import ShopScreen from '../../app/(app)/shop/index'
import { useMyPackIds, usePacks } from '@/features/packs/packs.queries'
import type { PackRow } from '@/features/packs/packs.api'

jest.mock('@/features/packs/packs.queries', () => ({ usePacks: jest.fn(), useMyPackIds: jest.fn() }))
const mockBack = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn() }) }))
jest.mock('@/components/game', () => ({
  ...jest.requireActual('@/components/game'),
  ScreenBackground: ({ children }: { children: React.ReactNode }) => children,
}))

const pack = (id: string, name: string): PackRow => ({
  id, slug: id, name, description: `${name} blurb`, kind: 'content', system_id: 'dnd5e-2024',
  artist_credit: null, cover_url: null, store_product_id: null, published: true, created_at: '2026-11-02T00:00:00Z',
})

const refetchPacks = jest.fn()
const refetchMine = jest.fn()

function mockQueries(opts: {
  packs?: PackRow[]; owned?: string[]; loading?: boolean; error?: boolean
}) {
  ;(usePacks as jest.Mock).mockReturnValue({
    data: opts.packs, isLoading: !!opts.loading, isError: !!opts.error, refetch: refetchPacks,
  })
  ;(useMyPackIds as jest.Mock).mockReturnValue({
    data: new Set(opts.owned ?? []), isLoading: false, isError: false, refetch: refetchMine,
  })
}

beforeEach(() => jest.clearAllMocks())

test('renders one card per pack, marking owned ones', () => {
  mockQueries({ packs: [pack('p1', 'Ember Court'), pack('p2', 'Tidewalkers')], owned: ['p1'] })
  render(<ShopScreen />)
  expect(screen.getByText('Ember Court')).toBeTruthy()
  expect(screen.getByText('Tidewalkers')).toBeTruthy()
  expect(screen.getAllByText('Owned')).toHaveLength(1)
  expect(screen.getAllByRole('button', { name: 'Coming soon' })).toHaveLength(1)
})

test('shows a loading placeholder while the catalog loads', () => {
  mockQueries({ loading: true })
  render(<ShopScreen />)
  expect(screen.getByLabelText('Loading packs')).toBeTruthy()
})

test('with no published packs it shows an empty state, not a blank screen', () => {
  mockQueries({ packs: [] })
  render(<ShopScreen />)
  expect(screen.getByText('No packs yet')).toBeTruthy()
})

test('a load failure shows an error with Try again, which refetches both queries', () => {
  mockQueries({ error: true })
  render(<ShopScreen />)
  expect(screen.getByText(/Couldn’t load packs/)).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Try again' }))
  expect(refetchPacks).toHaveBeenCalled()
  expect(refetchMine).toHaveBeenCalled()
})

test('Back leaves the shop', () => {
  mockQueries({ packs: [] })
  render(<ShopScreen />)
  fireEvent.press(screen.getByRole('button', { name: 'Back' }))
  expect(mockBack).toHaveBeenCalled()
})
