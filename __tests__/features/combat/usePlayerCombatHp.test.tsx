import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { updateResources, type CharacterFull } from '@/features/characters/characters.api'
import { usePlayerCombatHp } from '@/features/combat/usePlayerCombatHp'
import { showToast } from '@/components/ui/toast'
import { partyKey } from '@/features/party/party.queries'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import type { PoolValue } from '@/systems/types'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { character } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/characters/characters.api', () => ({ ...jest.requireActual('@/features/characters/characters.api'), updateResources: jest.fn() }))
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const mockWrite = updateResources as jest.Mock
const partyOf = (qc: QueryClient, id: string) =>
  (qc.getQueryData<CharacterFull[]>(partyKey('camp1', [id])) ?? []).find((c) => c.id === id)!
const hpOf = (c: CharacterFull) => c.resources.hp as PoolValue
const lastWritten = () => mockWrite.mock.calls[mockWrite.mock.calls.length - 1][1] as CharacterFull['resources']

function setup(c: CharacterFull) {
  const qc = makeTestQueryClient()
  qc.setQueryData(partyKey('camp1', [c.id]), [c])
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  const hook = renderHook(() => usePlayerCombatHp(partyOf(qc, c.id), 'camp1'), { wrapper })
  return { qc, ...hook }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockWrite.mockResolvedValue(undefined)
})

test('22/30 takes 7 damage and writes 15/30', async () => {
  const { result } = setup(character('c1', 'Mira'))
  act(() => result.current.damage(7))
  await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1))
  expect(mockWrite.mock.calls[0][0]).toBe('c1')
  expect(lastWritten().hp).toMatchObject({ current: 15, max: 30 })
})

test('damage above what is left stops at 0', async () => {
  const { result } = setup(character('c1', 'Mira', { hp: { current: 15 } }))
  act(() => result.current.damage(20))
  await waitFor(() => expect(mockWrite).toHaveBeenCalled())
  expect(lastWritten().hp).toMatchObject({ current: 0, max: 30 })
})

test('temp hit points absorb first: temp 5, hp 12, damage 7 writes temp 0 and hp 10', async () => {
  const { result } = setup(character('c1', 'Mira', { hp: { current: 12, temp: 5 } }))
  act(() => result.current.damage(7))
  await waitFor(() => expect(mockWrite).toHaveBeenCalled())
  expect(lastWritten().hp).toMatchObject({ current: 10, temp: 0 })
})

test('heal caps at max', async () => {
  const { result } = setup(character('c1', 'Mira'))
  act(() => result.current.heal(100))
  await waitFor(() => expect(mockWrite).toHaveBeenCalled())
  expect(lastWritten().hp).toMatchObject({ current: 30 })
})

test('temp keeps the larger of old and new', async () => {
  const { result } = setup(character('c1', 'Mira', { hp: { temp: 5 } }))
  act(() => result.current.temp(8))
  await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1))
  expect((lastWritten().hp as PoolValue).temp).toBe(8)
  act(() => result.current.temp(3))
  await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(2))
  expect((lastWritten().hp as PoolValue).temp).toBe(8)
})

test('the party cache shows the change at once, before the write finishes', () => {
  mockWrite.mockReturnValue(new Promise(() => {}))
  const { result, qc } = setup(character('c1', 'Mira'))
  act(() => result.current.damage(7))
  expect(hpOf(partyOf(qc, 'c1')).current).toBe(15)
})

test('undo after damage restores the previous pool', async () => {
  const { result, qc } = setup(character('c1', 'Mira'))
  expect(result.current.canUndo).toBe(false)
  act(() => result.current.damage(7))
  await waitFor(() => expect(result.current.canUndo).toBe(true))
  await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1))
  act(() => result.current.undo())
  await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(2))
  expect(lastWritten().hp).toMatchObject({ current: 22 })
  expect(hpOf(partyOf(qc, 'c1')).current).toBe(22)
  expect(result.current.canUndo).toBe(false)
})

test('undo after another device changed the pool writes nothing and says so', async () => {
  const { result, qc } = setup(character('c1', 'Mira'))
  act(() => result.current.damage(7))
  await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1))
  act(() => { qc.setQueryData(partyKey('camp1', ['c1']), [character('c1', 'Mira', { hp: { current: 9 } })]) })
  act(() => result.current.undo())
  expect(showToast).toHaveBeenCalledWith('HP changed since')
  expect(mockWrite).toHaveBeenCalledTimes(1)
  expect(result.current.canUndo).toBe(false)
})

test('a failed write rolls the party cache back and toasts', async () => {
  mockWrite.mockRejectedValue(new Error('boom'))
  const { result, qc } = setup(character('c1', 'Mira'))
  act(() => result.current.damage(7))
  await waitFor(() => expect(showToast).toHaveBeenCalledWith('boom'))
  expect(hpOf(partyOf(qc, 'c1')).current).toBe(22)
  expect(result.current.canUndo).toBe(false)
})

test('the only write is the resource update for the player’s own character', async () => {
  const { result } = setup(character('c1', 'Mira'))
  act(() => result.current.heal(3))
  await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1))
  expect(mockWrite.mock.calls.every(([id]) => id === 'c1')).toBe(true)
  expect(supabase.from).not.toHaveBeenCalled()
  expect(supabase.rpc).not.toHaveBeenCalled()
})

test('a write is based on the live party cache, never on a stale sheet cache', async () => {
  const qc = makeTestQueryClient()
  const live = character('c1', 'Mira', { hp: { current: 10 } })
  qc.setQueryData(partyKey('camp1', ['c1']), [live])
  qc.setQueryData(qk.character('c1'), character('c1', 'Mira', { hp: { current: 30 } }))
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  const { result } = renderHook(() => usePlayerCombatHp(live, 'camp1'), { wrapper })
  act(() => result.current.damage(4))
  await waitFor(() => expect(mockWrite).toHaveBeenCalled())
  expect(lastWritten().hp).toMatchObject({ current: 6 })
})

test('healing from 0 also clears the death saves', async () => {
  const dying = character('c1', 'Mira', { hp: { current: 0 } })
  ;(dying.resources.death_saves_failure as { tiers: Record<string, { max: number; used: number }> }).tiers['1'].used = 2
  const { result } = setup(dying)
  act(() => result.current.heal(5))
  await waitFor(() => expect(mockWrite).toHaveBeenCalled())
  const out = lastWritten()
  expect(out.hp).toMatchObject({ current: 5 })
  expect((out.death_saves_failure as { tiers: Record<string, { used: number }> }).tiers['1'].used).toBe(0)
})
