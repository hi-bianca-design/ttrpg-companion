import { getCharacters, updateCharacter, deleteCharacter } from '@/modules/character/character.service'

const mockSingle = jest.fn()
const mockOrder  = jest.fn()
const mockEq     = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
    })),
  },
}))

import { supabase } from '@/lib/supabase'

beforeEach(() => {
  jest.clearAllMocks()
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ order: mockOrder, single: mockSingle, eq: mockEq })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: mockEq })
})

describe('getCharacters', () => {
  it('calls from characters, filters by user_id, orders by created_at', async () => {
    await getCharacters('user-1')
    expect(supabase.from).toHaveBeenCalledWith('characters')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('throws when Supabase returns an error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await expect(getCharacters('user-1')).rejects.toThrow('DB error')
  })
})

describe('updateCharacter', () => {
  it('updates the record and returns the updated row', async () => {
    const updated = { id: 'c1', hp_current: 10 }
    mockSingle.mockResolvedValue({ data: updated, error: null })
    mockEq.mockReturnValue({ single: mockSingle, eq: mockEq, select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockSelect.mockReturnValue({ single: mockSingle, eq: mockEq })

    const result = await updateCharacter('c1', { hp_current: 10 })
    expect(supabase.from).toHaveBeenCalledWith('characters')
    expect(result.hp_current).toBe(10)
  })
})

describe('deleteCharacter', () => {
  it('calls delete then eq with character id', async () => {
    mockEq.mockResolvedValue({ error: null })
    await deleteCharacter('c1')
    expect(supabase.from).toHaveBeenCalledWith('characters')
    expect(mockEq).toHaveBeenCalledWith('id', 'c1')
  })
})
