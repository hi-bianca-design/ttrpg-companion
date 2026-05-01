import { act, renderHook } from '@testing-library/react-native'
import { useCharacterStore } from '@/modules/character/character.store'
import { INITIAL_DRAFT } from '@/modules/character/character.types'

beforeEach(() => useCharacterStore.getState().resetDraft())

describe('useCharacterStore', () => {
  it('starts with INITIAL_DRAFT', () => {
    const { result } = renderHook(() => useCharacterStore())
    expect(result.current.draft).toEqual(INITIAL_DRAFT)
  })

  it('setDraftField updates one field without touching others', () => {
    const { result } = renderHook(() => useCharacterStore())
    act(() => result.current.setDraftField('name', 'Aria'))
    expect(result.current.draft.name).toBe('Aria')
    expect(result.current.draft.strength).toBe(10)
  })

  it('setDraft merges multiple fields', () => {
    const { result } = renderHook(() => useCharacterStore())
    act(() => result.current.setDraft({ strength: 16, dexterity: 14 }))
    expect(result.current.draft.strength).toBe(16)
    expect(result.current.draft.dexterity).toBe(14)
    expect(result.current.draft.constitution).toBe(10)
  })

  it('resetDraft restores INITIAL_DRAFT', () => {
    const { result } = renderHook(() => useCharacterStore())
    act(() => result.current.setDraftField('name', 'Aria'))
    act(() => result.current.resetDraft())
    expect(result.current.draft).toEqual(INITIAL_DRAFT)
  })
})
