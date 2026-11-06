import { renderHook } from '@testing-library/react-native'
import { Platform } from 'react-native'
import { useHotkey } from '@/lib/useHotkey'

type Listener = (e: { key: string; ctrlKey: boolean; metaKey: boolean; preventDefault: () => void }) => void
let listeners: Listener[] = []
const press = (key: string, mods: { ctrlKey?: boolean; metaKey?: boolean } = {}) => {
  const preventDefault = jest.fn()
  listeners.slice().forEach((l) => l({ key, ctrlKey: false, metaKey: false, ...mods, preventDefault }))
  return preventDefault
}
const original = Platform.OS

beforeEach(() => {
  listeners = []
  ;(Platform as { OS: string }).OS = 'web'
  ;(global as unknown as { document: unknown }).document = {
    addEventListener: (_t: string, l: Listener) => listeners.push(l),
    removeEventListener: (_t: string, l: Listener) => { listeners = listeners.filter((x) => x !== l) },
  }
})
afterEach(() => {
  ;(Platform as { OS: string }).OS = original
  delete (global as unknown as { document?: unknown }).document
})

describe('useHotkey mod+k', () => {
  test('Control+K fires the handler and prevents the browser default', () => {
    const handler = jest.fn()
    renderHook(() => useHotkey('mod+k', handler, true))
    const pd = press('k', { ctrlKey: true })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(pd).toHaveBeenCalled()
  })
  test('Meta+K fires the handler', () => {
    const handler = jest.fn()
    renderHook(() => useHotkey('mod+k', handler, true))
    press('K', { metaKey: true })
    expect(handler).toHaveBeenCalledTimes(1)
  })
  test('plain k does not fire', () => {
    const handler = jest.fn()
    renderHook(() => useHotkey('mod+k', handler, true))
    const pd = press('k')
    expect(handler).not.toHaveBeenCalled()
    expect(pd).not.toHaveBeenCalled()
  })
  test('unmounting removes the listener', () => {
    const handler = jest.fn()
    const { unmount } = renderHook(() => useHotkey('mod+k', handler, true))
    unmount()
    expect(listeners).toHaveLength(0)
    press('k', { ctrlKey: true })
    expect(handler).not.toHaveBeenCalled()
  })
  test('enabled=false does not fire', () => {
    const handler = jest.fn()
    renderHook(() => useHotkey('mod+k', handler, false))
    press('k', { ctrlKey: true })
    expect(handler).not.toHaveBeenCalled()
  })
  test('the latest handler is called without re-subscribing', () => {
    const a = jest.fn()
    const b = jest.fn()
    const { rerender } = renderHook(({ h }: { h: () => void }) => useHotkey('mod+k', h, true), { initialProps: { h: a } })
    rerender({ h: b })
    press('k', { ctrlKey: true })
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })
  test('is a no-op on native', () => {
    ;(Platform as { OS: string }).OS = 'ios'
    const handler = jest.fn()
    renderHook(() => useHotkey('mod+k', handler, true))
    expect(listeners).toHaveLength(0)
  })
})
