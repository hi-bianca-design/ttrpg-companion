import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import * as api from '@/features/combat/combat.api'
import {
  useActiveCombat, useApplyEnemyHp, useCombatEntries, useCombatOrder, useNextTurn,
} from '@/features/combat/combat.queries'
import { AppError } from '@/features/errors'
import { qk } from '@/lib/query-client'

jest.mock('@/features/combat/combat.api', () => ({
  getActiveCombat: jest.fn(), getCombatOrder: jest.fn(), getCombatEntries: jest.fn(),
  startCombat: jest.fn(), setInitiative: jest.fn(), moveEntry: jest.fn(), nextTurn: jest.fn(), endMyTurn: jest.fn(),
  setCurrentEntry: jest.fn(), delayTurn: jest.fn(), addEnemies: jest.fn(), updateEnemy: jest.fn(), removeEntry: jest.fn(),
  applyEnemyHp: jest.fn(), undoEnemyHp: jest.fn(), newBatchId: jest.fn(() => 'gen-1'),
}))

const active = { id: 'cb1', campaign_id: 'c1', status: 'active' } as never
const rolling = { id: 'cb1', campaign_id: 'c1', status: 'rolling' } as never

function setup() {
  const client = makeTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

beforeEach(() => jest.clearAllMocks())

describe('query keys', () => {
  it('qk.combat(campaignId) is not a prefix of the order or entries keys', () => {
    const [head] = qk.combat('x')
    expect(qk.combatOrder('x')[0]).not.toBe(head)
    expect(qk.combatEntries('x')[0]).not.toBe(head)
    expect(qk.combatOrder('x')[0]).not.toBe(qk.combatEntries('x')[0])
  })
})

describe('useActiveCombat', () => {
  it('is disabled without a campaign id', () => {
    const { wrapper } = setup()
    renderHook(() => useActiveCombat(undefined), { wrapper })
    expect(api.getActiveCombat).not.toHaveBeenCalled()
  })

  it('returns the combat, or null', async () => {
    ;(api.getActiveCombat as jest.Mock).mockResolvedValueOnce(active).mockResolvedValueOnce(null)
    const a = setup()
    const first = renderHook(() => useActiveCombat('c1'), { wrapper: a.wrapper })
    await waitFor(() => expect(first.result.current.data).toEqual(active))
    const b = setup()
    const second = renderHook(() => useActiveCombat('c2'), { wrapper: b.wrapper })
    await waitFor(() => expect(second.result.current.data).toBeNull())
  })
})

describe('useCombatOrder', () => {
  it('is idle while the combat is rolling (the projection is empty then)', () => {
    const { wrapper } = setup()
    renderHook(() => useCombatOrder(rolling), { wrapper })
    expect(api.getCombatOrder).not.toHaveBeenCalled()
  })

  it('loads the order while active', async () => {
    ;(api.getCombatOrder as jest.Mock).mockResolvedValue([{ id: 'a' }])
    const { wrapper } = setup()
    const { result } = renderHook(() => useCombatOrder(active), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'a' }]))
    expect(api.getCombatOrder).toHaveBeenCalledWith('cb1')
  })

  it('is idle without a combat', () => {
    const { wrapper } = setup()
    renderHook(() => useCombatOrder(null), { wrapper })
    expect(api.getCombatOrder).not.toHaveBeenCalled()
  })
})

describe('useCombatEntries', () => {
  it('never calls the API for a player', () => {
    const { wrapper } = setup()
    renderHook(() => useCombatEntries(active, false), { wrapper })
    expect(api.getCombatEntries).not.toHaveBeenCalled()
  })

  it('loads entries for the GM, rolling or active', async () => {
    ;(api.getCombatEntries as jest.Mock).mockResolvedValue([{ id: 'a' }])
    const { wrapper } = setup()
    const { result } = renderHook(() => useCombatEntries(rolling, true), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'a' }]))
    expect(api.getCombatEntries).toHaveBeenCalledWith('cb1')
  })
})

describe('mutations', () => {
  it('invalidate the three keys after success', async () => {
    ;(api.applyEnemyHp as jest.Mock).mockResolvedValue('batch-1')
    const { client, wrapper } = setup()
    const spy = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useApplyEnemyHp('c1', 'cb1'), { wrapper })
    await act(async () => {
      await expect(result.current.mutateAsync({ entryIds: ['e1'], mode: 'damage', amount: 5, batch: 'b-1' })).resolves.toBe('batch-1')
    })
    expect(api.applyEnemyHp).toHaveBeenCalledWith('cb1', ['e1'], 'damage', 5, 'b-1')
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: unknown }).queryKey)
    expect(keys).toEqual(expect.arrayContaining([qk.combat('c1'), qk.combatOrder('cb1'), qk.combatEntries('cb1')]))
  })

  it('generates a batch id when the caller gives none', async () => {
    ;(api.applyEnemyHp as jest.Mock).mockResolvedValue('gen-1')
    const { wrapper } = setup()
    const { result } = renderHook(() => useApplyEnemyHp('c1', 'cb1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ entryIds: ['e1'], mode: 'heal', amount: 2 }) })
    expect(api.applyEnemyHp).toHaveBeenCalledWith('cb1', ['e1'], 'heal', 2, 'gen-1')
  })

  it('a failing mutation surfaces the error and still invalidates the three keys', async () => {
    ;(api.nextTurn as jest.Mock).mockRejectedValue(new AppError('no_active_combat'))
    const { client, wrapper } = setup()
    const spy = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useNextTurn('c1', 'cb1'), { wrapper })
    await act(async () => {
      await expect(result.current.mutateAsync({ expectedEntryId: 'e1' })).rejects.toMatchObject({ code: 'no_active_combat' })
    })
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: unknown }).queryKey)
    expect(keys).toEqual(expect.arrayContaining([qk.combat('c1'), qk.combatOrder('cb1'), qk.combatEntries('cb1')]))
  })
})
