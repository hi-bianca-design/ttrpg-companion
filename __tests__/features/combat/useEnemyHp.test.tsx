import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { applyEnemyHp, newBatchId, undoEnemyHp } from '@/features/combat/combat.api'
import { useEnemyHp } from '@/features/combat/useEnemyHp'
import { showToast } from '@/components/ui/toast'
import { AppError, ERROR_COPY } from '@/features/errors'
import { makeTestQueryClient } from '../../helpers/queryClient'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('@/features/combat/combat.api')
jest.mock('@/components/ui/toast', () => ({ showToast: jest.fn() }))

const mockApply = applyEnemyHp as jest.Mock
const mockUndo = undoEnemyHp as jest.Mock

function setup() {
  const client = makeTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(() => useEnemyHp('camp1', 'cb1'), { wrapper })
}

let n = 0
beforeEach(() => {
  jest.clearAllMocks()
  n = 0
  ;(newBatchId as jest.Mock).mockReturnValue('client-batch')
  mockApply.mockImplementation(async () => `batch-${++n}`)
  mockUndo.mockResolvedValue(1)
})

test('apply reports whether it worked, so a bulk caller knows to keep its selection', async () => {
  const { result } = setup()
  let ok: boolean | undefined
  await act(async () => { ok = await result.current.apply(['a'], 'damage', 7) })
  expect(ok).toBe(true)
  mockApply.mockRejectedValue(new AppError('network'))
  await act(async () => { ok = await result.current.apply(['a'], 'damage', 7) })
  expect(ok).toBe(false)
})

test('apply calls the server once and makes that row undoable', async () => {
  const { result } = setup()
  await act(() => result.current.apply(['a'], 'damage', 7))
  expect(mockApply).toHaveBeenCalledTimes(1)
  expect(mockApply).toHaveBeenCalledWith('cb1', ['a'], 'damage', 7, 'client-batch')
  expect(result.current.canUndo('a')).toBe(true)
  expect(result.current.canUndo('b')).toBe(false)
})

test('a bulk apply is one batch for every id and one undo clears them all', async () => {
  const { result } = setup()
  await act(() => result.current.apply(['a', 'b', 'c', 'd'], 'damage', 5))
  for (const id of ['a', 'b', 'c', 'd']) expect(result.current.canUndo(id)).toBe(true)
  await act(() => result.current.undoFor('b'))
  expect(mockUndo).toHaveBeenCalledTimes(1)
  expect(mockUndo).toHaveBeenCalledWith('cb1', 'batch-1')
  for (const id of ['a', 'b', 'c', 'd']) expect(result.current.canUndo(id)).toBe(false)
})

test('a later apply to one id replaces only that id’s batch', async () => {
  const { result } = setup()
  await act(() => result.current.apply(['a', 'b'], 'damage', 5))
  await act(() => result.current.apply(['a'], 'heal', 2))
  await act(() => result.current.undoFor('a'))
  expect(mockUndo).toHaveBeenCalledWith('cb1', 'batch-2')
  expect(result.current.canUndo('a')).toBe(false)
  expect(result.current.canUndo('b')).toBe(true)
  await act(() => result.current.undoFor('b'))
  expect(mockUndo).toHaveBeenLastCalledWith('cb1', 'batch-1')
})

test('two synchronous applies while the first is pending are one request', async () => {
  const { result } = setup()
  await act(async () => {
    const first = result.current.apply(['a'], 'damage', 7)
    const second = result.current.apply(['a'], 'damage', 7)
    await Promise.all([first, second])
  })
  expect(mockApply).toHaveBeenCalledTimes(1)
})

test('a double tapped Undo is one request', async () => {
  const { result } = setup()
  await act(() => result.current.apply(['a'], 'damage', 7))
  await act(async () => {
    await Promise.all([result.current.undoFor('a'), result.current.undoFor('a')])
  })
  expect(mockUndo).toHaveBeenCalledTimes(1)
})

test('a rejected apply toasts the plain copy and leaves nothing to undo', async () => {
  mockApply.mockRejectedValue(new AppError('no_active_combat'))
  const { result } = setup()
  await act(() => result.current.apply(['a'], 'damage', 7))
  expect(showToast).toHaveBeenCalledWith(ERROR_COPY.no_active_combat)
  expect(result.current.canUndo('a')).toBe(false)
  await waitFor(() => expect(result.current.pending).toBe(false))
})

test('a rejected undo toasts and keeps the undo available', async () => {
  const { result } = setup()
  await act(() => result.current.apply(['a'], 'damage', 7))
  mockUndo.mockRejectedValue(new AppError('network'))
  await act(() => result.current.undoFor('a'))
  expect(showToast).toHaveBeenCalledWith(ERROR_COPY.network)
  expect(result.current.canUndo('a')).toBe(true)
})

test('an undo that restored nothing says HP changed since and drops the stale undo', async () => {
  const { result } = setup()
  await act(() => result.current.apply(['a'], 'damage', 7))
  mockUndo.mockResolvedValue(0)
  await act(() => result.current.undoFor('a'))
  expect(showToast).toHaveBeenCalledWith('HP changed since')
  expect(result.current.canUndo('a')).toBe(false)
})

test('undoFor an id with no batch does nothing', async () => {
  const { result } = setup()
  await act(() => result.current.undoFor('zzz'))
  expect(mockUndo).not.toHaveBeenCalled()
})
