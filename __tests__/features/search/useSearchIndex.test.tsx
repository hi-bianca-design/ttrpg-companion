import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { listContent } from '@/features/content/content.api'
import { listEncounters } from '@/features/encounters/encounters.api'
import { useSearchIndex } from '@/features/search/useSearchIndex'
import { makeTestQueryClient } from '../../helpers/queryClient'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/content/content.api')
jest.mock('@/features/encounters/encounters.api')

const wrap = (client = makeTestQueryClient()) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

beforeEach(() => {
  jest.clearAllMocks()
  ;(listContent as jest.Mock).mockImplementation(async ({ kind }: { kind: string }) =>
    kind === 'spell' ? [{ id: 's1', kind: 'spell', name: 'Fireball', description: 'Boom', summary: null }] : [])
  ;(listEncounters as jest.Mock).mockResolvedValue([{ id: 'e1', name: 'Goblin Ambush', story_why: null, enemies: [] }])
})

test('loads the official kinds and the campaign encounters', async () => {
  const { result } = renderHook(() => useSearchIndex('dnd5e-2024', 'camp1', true), { wrapper: wrap() })
  await waitFor(() => expect(result.current.ready).toBe(true))
  expect(result.current.items.map((i) => [i.name, i.group])).toEqual([['Fireball', 'SRD'], ['Goblin Ambush', 'Encounters']])
  expect(listContent).toHaveBeenCalledWith({ systemId: 'dnd5e-2024', kind: 'subclass', scope: 'official' })
})

test('does not fetch for a non-GM', () => {
  const { result } = renderHook(() => useSearchIndex('dnd5e-2024', 'camp1', false), { wrapper: wrap() })
  expect(result.current).toEqual({ items: [], ready: false })
  expect(listContent).not.toHaveBeenCalled()
  expect(listEncounters).not.toHaveBeenCalled()
})

test('items keep their identity across re-renders while the data is unchanged', async () => {
  const { result, rerender } = renderHook(() => useSearchIndex('dnd5e-2024', 'camp1', true), { wrapper: wrap() })
  await waitFor(() => expect(result.current.ready).toBe(true))
  const first = result.current.items
  rerender({})
  rerender({})
  expect(result.current.items).toBe(first)
})

test('a re-render with unchanged data does not walk the SRD rows again', async () => {
  // Counts reads of the loaded rows: only flattening them (combine) or indexing them reads an element.
  let reads = 0
  const rows = new Proxy([{ id: 's1', kind: 'spell', name: 'Fireball', description: 'Boom', summary: null }], {
    get: (target, key, receiver) => {
      if (typeof key === 'string' && /^\d+$/.test(key)) reads++
      return Reflect.get(target, key, receiver)
    },
  })
  ;(listContent as jest.Mock).mockImplementation(async ({ kind }: { kind: string }) => (kind === 'spell' ? rows : []))
  const { result, rerender } = renderHook(() => useSearchIndex('dnd5e-2024', 'camp1', true), { wrapper: wrap() })
  await waitFor(() => expect(result.current.ready).toBe(true))
  const before = reads
  rerender({})
  rerender({})
  expect(reads).toBe(before)
})
