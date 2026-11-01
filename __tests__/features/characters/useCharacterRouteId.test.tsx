import { renderHook } from '@testing-library/react-native'
import { CharacterRouteIdContext, useCharacterRouteId } from '@/features/characters/useCharacterRouteId'

let mockLocal: { id?: string } = {}
let mockGlobal: { id?: string } = {}
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockLocal,
  useGlobalSearchParams: () => mockGlobal,
}))

test('prefers the screen’s own id over the global (focused-route) id', () => {
  mockLocal = { id: 'char-1' }
  mockGlobal = { id: 'campaign-9' }
  expect(renderHook(() => useCharacterRouteId()).result.current).toBe('char-1')
})

test('falls back to the global id when the screen has no local id', () => {
  mockLocal = {}
  mockGlobal = { id: 'char-2' }
  expect(renderHook(() => useCharacterRouteId()).result.current).toBe('char-2')
})

test('the layout-provided id wins over local and global params', () => {
  mockLocal = { id: 'char-3' }
  mockGlobal = { id: 'campaign-9' }
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CharacterRouteIdContext.Provider value="layout-id">{children}</CharacterRouteIdContext.Provider>
  )
  expect(renderHook(() => useCharacterRouteId(), { wrapper }).result.current).toBe('layout-id')
})
