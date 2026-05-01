import { getCharacters, updateCharacter, deleteCharacter, createCharacter } from '@/modules/character/character.service'
import { INITIAL_DRAFT } from '@/modules/character/character.types'

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
  mockEq.mockReturnValue({ order: mockOrder, single: mockSingle, eq: mockEq, select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: mockEq })
  mockInsert.mockResolvedValue({ data: [{ id: 'c1' }], error: null })
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
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ select: mockSelect, single: mockSingle, eq: mockEq, order: mockOrder })
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

describe('createCharacter', () => {
  it('inserts a character and returns the created row', async () => {
    const created = { id: 'c1', name: 'Aria', level: 1 }
    mockSingle.mockResolvedValue({ data: created, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })
    mockInsert.mockReturnValue({ select: mockSelect })

    const draft = { ...INITIAL_DRAFT, name: 'Aria', class_id: 'cls1', hit_die: 10 }
    const result = await createCharacter('user-1', draft)
    expect(supabase.from).toHaveBeenCalledWith('characters')
    expect(result.name).toBe('Aria')
  })
})
