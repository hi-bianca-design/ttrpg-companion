/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react-native'
import { useDarkClassOnWeb } from '@/lib/web-theme'

afterEach(() => document.documentElement.classList.remove('dark'))

test('on web the dark class follows the colour scheme and stays in sync', () => {
  const { rerender } = renderHook(({ scheme }: { scheme: 'light' | 'dark' | undefined }) => useDarkClassOnWeb(scheme, 'web'), {
    initialProps: { scheme: 'dark' },
  })
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  rerender({ scheme: 'light' })
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  rerender({ scheme: 'dark' })
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  rerender({ scheme: undefined })
  expect(document.documentElement.classList.contains('dark')).toBe(false)
})

test('native platforms leave the document alone', () => {
  renderHook(() => useDarkClassOnWeb('dark', 'ios'))
  expect(document.documentElement.classList.contains('dark')).toBe(false)
})
