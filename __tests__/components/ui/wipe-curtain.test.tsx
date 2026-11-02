import { act, render, screen } from '@testing-library/react-native'
import { usePathname } from 'expo-router'
import { Animated } from 'react-native'
import { curtainGeometry, WIPE_MS, WipeCurtain } from '@/components/ui/wipe-curtain'

jest.mock('expo-router', () => ({ usePathname: jest.fn() }))

test('the curtain starts fully off-screen left and ends fully off-screen right, with room for the lean', () => {
  const g = curtainGeometry(400, 800)
  expect(g.feather).toBe(24)
  expect(g.from).toBeLessThan(-g.feather)
  expect(g.to).toBeGreaterThan(400)
  expect(g.solid).toBeGreaterThan(400)
})

test('the first screen does not wipe; a path change starts a native-driven wipe', () => {
  const timing = jest.spyOn(Animated, 'timing')
  ;(usePathname as jest.Mock).mockReturnValue('/characters')
  const { rerender } = render(<WipeCurtain />)
  expect(timing).not.toHaveBeenCalled()
  ;(usePathname as jest.Mock).mockReturnValue('/campaigns')
  act(() => rerender(<WipeCurtain />))
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: WIPE_MS, useNativeDriver: true }))
  expect(screen.getByTestId('wipe-curtain', { includeHiddenElements: true }).props.pointerEvents).toBe('none')
})
