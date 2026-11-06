import type { ReactNode } from 'react'
import { QueryClientProvider, dehydrate, hydrate, onlineManager, type QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { applyEnemyHp, nextTurn, updateEnemy, setCurrentEntry, moveEntry, getCombatEntries, type CombatEntry } from '@/features/combat/combat.api'
import { useApplyEnemyHp, useMoveEntry, useNextTurn, useSetCurrentEntry, useUpdateEnemy } from '@/features/combat/combat.queries'
import { registerCombatMutationDefaults, sentOrQueued } from '@/features/combat/offlineMutations'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { combat, enemy, entry } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api', () => ({
  ...jest.requireActual('@/features/combat/combat.api'),
  applyEnemyHp: jest.fn(), nextTurn: jest.fn(), updateEnemy: jest.fn(), setCurrentEntry: jest.fn(), moveEntry: jest.fn(),
  getCombatEntries: jest.fn(), getActiveCombat: jest.fn(), getCombatOrder: jest.fn(),
}))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const m = {
  hp: applyEnemyHp as jest.Mock, next: nextTurn as jest.Mock, update: updateEnemy as jest.Mock,
  set: setCurrentEntry as jest.Mock, move: moveEntry as jest.Mock, entries: getCombatEntries as jest.Mock,
}

const rows = (): CombatEntry[] => [
  entry({ id: 'p1', position: 1, is_current: true }),
  enemy({ id: 'g1', position: 2, hp: 22, max_hp: 30 }),
  enemy({ id: 'g2', position: 3, hp: 0, max_hp: 7 }),
  entry({ id: 'p2', position: 4 }),
]

let client: QueryClient
function setup() {
  client = makeTestQueryClient()
  client.setQueryData(qk.combatEntries('cb1'), rows())
  client.setQueryData(qk.combat('camp1'), combat({ round: 2 }))
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { wrapper }
}
const cached = () => client.getQueryData<CombatEntry[]>(qk.combatEntries('cb1'))!
const byId = (id: string) => cached().find((e) => e.id === id)!

beforeEach(() => {
  jest.clearAllMocks()
  m.hp.mockImplementation(async (_c, _ids, _mode, _n, batch: string) => batch)
  for (const k of ['next', 'update', 'set', 'move'] as const) m[k].mockResolvedValue(combat())
  m.entries.mockImplementation(async () => cached())
})
afterEach(() => {
  act(() => onlineManager.setOnline(true))
})

describe('offline damage', () => {
  test('updates the cached card at once and calls no RPC', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useApplyEnemyHp('camp1', 'cb1'), { wrapper })
    act(() => onlineManager.setOnline(false))
    act(() => { result.current.mutate({ entryIds: ['g1'], mode: 'damage', amount: 7, batch: 'b-1' }) })
    await waitFor(() => expect(byId('g1').hp).toBe(15))
    expect(m.hp).not.toHaveBeenCalled()
    expect(client.getMutationCache().getAll()[0].state.isPaused).toBe(true)
  })

  test('going online sends it exactly once, with the same batch id', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useApplyEnemyHp('camp1', 'cb1'), { wrapper })
    act(() => onlineManager.setOnline(false))
    act(() => { result.current.mutate({ entryIds: ['g1'], mode: 'damage', amount: 7, batch: 'b-1' }) })
    await waitFor(() => expect(byId('g1').hp).toBe(15))
    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(m.hp).toHaveBeenCalledTimes(1))
    expect(m.hp).toHaveBeenCalledWith('cb1', ['g1'], 'damage', 7, 'b-1')
    // A second online flip has nothing left to send.
    act(() => onlineManager.setOnline(false))
    act(() => onlineManager.setOnline(true))
    await act(async () => { await client.resumePausedMutations() })
    expect(m.hp).toHaveBeenCalledTimes(1)
  })

  test('a queued batch survives a reload: the restored mutation resumes from the defaults', async () => {
    const { wrapper } = setup()
    const { result, unmount } = renderHook(() => useApplyEnemyHp('camp1', 'cb1'), { wrapper })
    act(() => onlineManager.setOnline(false))
    act(() => { result.current.mutate({ entryIds: ['g1'], mode: 'damage', amount: 7, batch: 'b-1' }) })
    await waitFor(() => expect(client.getMutationCache().getAll()[0]?.state.isPaused).toBe(true))
    // JSON round trip, as the persister stores it. Then the page "reloads": the old client is gone.
    const state = JSON.parse(JSON.stringify(dehydrate(client)))
    unmount()
    client.getMutationCache().clear()

    const reloaded = makeTestQueryClient()
    registerCombatMutationDefaults(reloaded)
    hydrate(reloaded, state)
    expect(reloaded.getQueryData<CombatEntry[]>(qk.combatEntries('cb1'))!.find((e) => e.id === 'g1')!.hp).toBe(15)
    act(() => onlineManager.setOnline(true))
    await act(async () => { await reloaded.resumePausedMutations() })
    expect(m.hp).toHaveBeenCalledTimes(1)
    expect(m.hp).toHaveBeenCalledWith('cb1', ['g1'], 'damage', 7, 'b-1')
  })
})

describe('offline turns', () => {
  test('Next turn moves the highlight locally, skipping a downed enemy, and wraps the round', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useNextTurn('camp1', 'cb1'), { wrapper })
    act(() => onlineManager.setOnline(false))
    act(() => { result.current.mutate({ expectedEntryId: 'p1' }) })
    await waitFor(() => expect(byId('g1').is_current).toBe(true))
    act(() => { result.current.mutate({ expectedEntryId: 'g1' }) })
    await waitFor(() => expect(byId('p2').is_current).toBe(true))
    expect(byId('g2').is_current).toBe(false)
    act(() => { result.current.mutate({ expectedEntryId: 'p2' }) })
    await waitFor(() => expect(byId('p1').is_current).toBe(true))
    expect(client.getQueryData<{ round: number }>(qk.combat('camp1'))!.round).toBe(3)
    expect(m.next).not.toHaveBeenCalled()
  })

  test('a stale expectation is a local no-op, like the server', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useNextTurn('camp1', 'cb1'), { wrapper })
    act(() => onlineManager.setOnline(false))
    act(() => { result.current.mutate({ expectedEntryId: 'g1' }) })
    await waitFor(() => expect(client.getMutationCache().getAll()[0]?.state.isPaused).toBe(true))
    expect(byId('p1').is_current).toBe(true)
  })

  test('two queued Next turns whose expectations are stale on the server replay in order without error', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useNextTurn('camp1', 'cb1'), { wrapper })
    act(() => onlineManager.setOnline(false))
    act(() => { result.current.mutate({ expectedEntryId: 'p1' }) })
    await waitFor(() => expect(byId('g1').is_current).toBe(true))
    act(() => { result.current.mutate({ expectedEntryId: 'g1' }) })
    await waitFor(() => expect(byId('p2').is_current).toBe(true))
    // The server moved on meanwhile (a player ended their turn): both calls are stale, next_turn returns the combat unchanged.
    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(m.next).toHaveBeenCalledTimes(2))
    expect(m.next.mock.calls).toEqual([['cb1', 'p1'], ['cb1', 'g1']])
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(client.getMutationCache().getAll().every((x) => x.state.status === 'success')).toBe(true)
    expect(showToast).not.toHaveBeenCalled()
  })
})

describe('other queued edits', () => {
  test('updateEnemy, setCurrent and move apply locally while offline', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => ({
      update: useUpdateEnemy('camp1', 'cb1'), set: useSetCurrentEntry('camp1', 'cb1'), move: useMoveEntry('camp1', 'cb1'),
    }), { wrapper })
    act(() => onlineManager.setOnline(false))
    act(() => { result.current.update.mutate({ entryId: 'g1', patch: { conditions: ['Prone'], notes: ' tired ', hidden: true, hp: 99 } }) })
    await waitFor(() => expect(byId('g1').conditions).toEqual(['Prone']))
    expect(byId('g1')).toMatchObject({ notes: 'tired', hidden: true, hp: 30 })
    act(() => { result.current.set.mutate({ entryId: 'g2' }) })
    await waitFor(() => expect(byId('g2').is_current).toBe(true))
    expect(byId('p1').is_current).toBe(false)
    act(() => { result.current.move.mutate({ entryId: 'p2', toPosition: 1 }) })
    await waitFor(() => expect([...cached()].sort((a, b) => a.position - b.position).map((e) => e.id)).toEqual(['p2', 'p1', 'g1', 'g2']))
    expect(m.update).not.toHaveBeenCalled()
    expect(m.set).not.toHaveBeenCalled()
    expect(m.move).not.toHaveBeenCalled()
    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(m.move).toHaveBeenCalledWith('p2', 1))
    expect(m.update).toHaveBeenCalledTimes(1)
    expect(m.set).toHaveBeenCalledWith('g2')
  })
})

describe('a failed replay', () => {
  test('rolls the cache back by refetching and shows a toast', async () => {
    m.hp.mockRejectedValue(new AppError('no_active_combat'))
    const { wrapper } = setup()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useApplyEnemyHp('camp1', 'cb1'), { wrapper })
    act(() => onlineManager.setOnline(false))
    act(() => { result.current.mutate({ entryIds: ['g1'], mode: 'damage', amount: 7, batch: 'b-1' }) })
    await waitFor(() => expect(byId('g1').hp).toBe(15))
    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ERROR_COPY.no_active_combat))
    const keys = invalidate.mock.calls.map((c) => (c[0] as { queryKey: unknown }).queryKey)
    expect(keys).toEqual(expect.arrayContaining([qk.combat('camp1'), qk.combatOrder('cb1'), qk.combatEntries('cb1')]))
  })

  test('an online failure is left to the caller (one toast, not two)', async () => {
    m.hp.mockRejectedValue(new AppError('network'))
    const { wrapper } = setup()
    const { result } = renderHook(() => useApplyEnemyHp('camp1', 'cb1'), { wrapper })
    await act(async () => {
      await expect(result.current.mutateAsync({ entryIds: ['g1'], mode: 'damage', amount: 7, batch: 'b-1' })).rejects.toMatchObject({ code: 'network' })
    })
    expect(showToast).not.toHaveBeenCalled()
  })
})

describe('sentOrQueued', () => {
  test('online it waits for the server', async () => {
    let resolve!: (v: string) => void
    const p = new Promise<string>((r) => { resolve = r })
    const out = sentOrQueued(p)
    resolve('done')
    await expect(out).resolves.toBe('done')
  })

  test('offline it resolves at once with nothing and swallows a later failure', async () => {
    act(() => onlineManager.setOnline(false))
    const p = Promise.reject(new Error('later'))
    await expect(sentOrQueued(p)).resolves.toBeUndefined()
  })
})
