import {
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  removeInventoryItem,
} from '@/modules/inventory/inventory.service'

const mockSingle = jest.fn()
const mockEq     = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockOrder  = jest.fn()

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
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: mockEq })
  mockInsert.mockReturnValue({ select: mockSelect })
})

describe('getInventory', () => {
  it('queries character_inventory filtered by character_id', async () => {
    await getInventory('char-1')
    expect(supabase.from).toHaveBeenCalledWith('character_inventory')
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('equipment:equipment(*)'))
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('magic_item:magic_items(*)'))
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('campaign_item:campaign_items(*)'))
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('character_inventory_custom_content_id_fkey'))
    expect(mockEq).toHaveBeenCalledWith('character_id', 'char-1')
    expect(mockOrder).toHaveBeenCalledWith('acquired_at', { ascending: true })
  })

  it('throws on error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await expect(getInventory('char-1')).rejects.toThrow('DB error')
  })
})

describe('addInventoryItem', () => {
  it('inserts into character_inventory with equipment_id', async () => {
    const created = { id: 'inv-1', character_id: 'char-1', equipment_id: 'eq-1' }
    mockSingle.mockResolvedValue({ data: created, error: null })
    mockSelect.mockReturnValue({ single: mockSingle, eq: mockEq, order: mockOrder })

    const result = await addInventoryItem('char-1', { equipment_id: 'eq-1', quantity: 2 })

    expect(supabase.from).toHaveBeenCalledWith('character_inventory')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        character_id: 'char-1',
        equipment_id: 'eq-1',
        quantity:     2,
      })
    )
    expect(result.id).toBe('inv-1')
  })

  it('inserts with magic_item_id', async () => {
    const created = { id: 'inv-2', character_id: 'char-1', magic_item_id: 'mi-1' }
    mockSingle.mockResolvedValue({ data: created, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })

    await addInventoryItem('char-1', { magic_item_id: 'mi-1' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ magic_item_id: 'mi-1' })
    )
  })

  it('inserts with campaign_item_id', async () => {
    const created = { id: 'inv-3', character_id: 'char-1', campaign_item_id: 'ci-1' }
    mockSingle.mockResolvedValue({ data: created, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })

    await addInventoryItem('char-1', { campaign_item_id: 'ci-1' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ campaign_item_id: 'ci-1' })
    )
  })

  it('inserts with custom_content_id', async () => {
    const created = { id: 'inv-4', character_id: 'char-1', custom_content_id: 'cc-1' }
    mockSingle.mockResolvedValue({ data: created, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })

    await addInventoryItem('char-1', { custom_content_id: 'cc-1' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ custom_content_id: 'cc-1' })
    )
  })

  it('throws when zero sources provided', async () => {
    await expect(addInventoryItem('char-1', {})).rejects.toThrow('Exactly one item source must be provided')
  })

  it('throws when multiple sources provided', async () => {
    await expect(
      addInventoryItem('char-1', { equipment_id: 'eq-1', magic_item_id: 'mi-1' })
    ).rejects.toThrow('Exactly one item source must be provided')
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    mockSelect.mockReturnValue({ single: mockSingle })
    await expect(
      addInventoryItem('char-1', { equipment_id: 'eq-1' })
    ).rejects.toThrow('insert failed')
  })
})

describe('updateInventoryItem', () => {
  it('updates an inventory row by id', async () => {
    const updated = { id: 'inv-1', is_equipped: true }
    mockSingle.mockResolvedValue({ data: updated, error: null })
    mockEq.mockReturnValue({ select: mockSelect, single: mockSingle, eq: mockEq })
    mockSelect.mockReturnValue({ single: mockSingle })

    const result = await updateInventoryItem('inv-1', { is_equipped: true })
    expect(supabase.from).toHaveBeenCalledWith('character_inventory')
    expect(mockEq).toHaveBeenCalledWith('id', 'inv-1')
    expect(result.is_equipped).toBe(true)
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })
    mockEq.mockReturnValue({ select: mockSelect, single: mockSingle })
    mockSelect.mockReturnValue({ single: mockSingle })
    await expect(updateInventoryItem('inv-1', { quantity: 3 })).rejects.toThrow('update failed')
  })
})

describe('removeInventoryItem', () => {
  it('deletes an inventory row by id', async () => {
    mockEq.mockResolvedValue({ error: null })
    await removeInventoryItem('inv-1')
    expect(supabase.from).toHaveBeenCalledWith('character_inventory')
    expect(mockEq).toHaveBeenCalledWith('id', 'inv-1')
  })

  it('throws on error', async () => {
    mockEq.mockResolvedValue({ error: { message: 'delete failed' } })
    await expect(removeInventoryItem('inv-1')).rejects.toThrow('delete failed')
  })
})
