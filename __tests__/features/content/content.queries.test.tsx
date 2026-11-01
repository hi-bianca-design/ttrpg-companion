import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { useDeleteHomebrew, useSaveHomebrew } from '@/features/content/content.queries'
import { deleteHomebrew, saveHomebrew } from '@/features/content/content.api'
import { qk } from '@/lib/query-client'

jest.mock('@/features/content/content.api', () => ({ saveHomebrew: jest.fn(), deleteHomebrew: jest.fn() }))

function setup<T>(hook: () => T) {
  const qc = makeTestQueryClient()
  const invalidate = jest.spyOn(qc, 'invalidateQueries')
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  return { invalidate, result: renderHook(hook, { wrapper }).result }
}

const keysOf = (spy: jest.SpyInstance) => spy.mock.calls.map(([f]) => (f as { queryKey: unknown }).queryKey)

beforeEach(() => jest.clearAllMocks())

test('saving homebrew refreshes content lists and every cached character (sheets that use it)', async () => {
  ;(saveHomebrew as jest.Mock).mockResolvedValue({ id: 'c1' })
  const { invalidate, result } = setup(() => useSaveHomebrew())
  await act(async () => { await result.current.mutateAsync({ systemId: 'dnd5e-2024', kind: 'feat', name: 'X', data: {} }) })
  expect(keysOf(invalidate)).toEqual(expect.arrayContaining([['content'], ['character'], qk.characters]))
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
})

test('deleting homebrew refreshes content lists and every cached character', async () => {
  ;(deleteHomebrew as jest.Mock).mockResolvedValue(undefined)
  const { invalidate, result } = setup(() => useDeleteHomebrew())
  await act(async () => { await result.current.mutateAsync('c1') })
  expect(keysOf(invalidate)).toEqual(expect.arrayContaining([['content'], ['character'], qk.characters]))
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
})
