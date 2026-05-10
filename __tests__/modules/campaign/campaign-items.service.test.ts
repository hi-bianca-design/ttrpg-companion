import {
  getCampaignItems,
  createCampaignItem,
  updateCampaignItem,
  deleteCampaignItem,
} from '@/modules/campaign/campaign-items.service'

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

describe('getCampaignItems', () => {
  it('queries campaign_items filtered by campaign_id', async () => {
    await getCampaignItems('campaign-1')
    expect(supabase.from).toHaveBeenCalledWith('campaign_items')
    expect(mockEq).toHaveBeenCalledWith('campaign_id', 'campaign-1')
  })

  it('throws on error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await expect(getCampaignItems('campaign-1')).rejects.toThrow('DB error')
  })
})

describe('createCampaignItem', () => {
  it('inserts into campaign_items with campaign_id and created_by', async () => {
    const created = { id: 'item-1', name: 'Sword of Plot', campaign_id: 'campaign-1' }
    mockSingle.mockResolvedValue({ data: created, error: null })
    mockSelect.mockReturnValue({ single: mockSingle, eq: mockEq, order: mockOrder })

    const result = await createCampaignItem('campaign-1', 'dm-user-1', {
      name: 'Sword of Plot',
      item_type: 'weapon',
    })

    expect(supabase.from).toHaveBeenCalledWith('campaign_items')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_id: 'campaign-1',
        created_by:  'dm-user-1',
        name:        'Sword of Plot',
        item_type:   'weapon',
      })
    )
    expect(result.id).toBe('item-1')
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    mockSelect.mockReturnValue({ single: mockSingle })
    await expect(
      createCampaignItem('campaign-1', 'dm-1', { name: 'X', item_type: 'misc' })
    ).rejects.toThrow('insert failed')
  })
})

describe('updateCampaignItem', () => {
  it('updates a campaign item by id', async () => {
    const updated = { id: 'item-1', name: 'Sword of Plot (Updated)' }
    mockSingle.mockResolvedValue({ data: updated, error: null })
    mockEq.mockReturnValue({ select: mockSelect, single: mockSingle, eq: mockEq })
    mockSelect.mockReturnValue({ single: mockSingle })

    const result = await updateCampaignItem('item-1', { name: 'Sword of Plot (Updated)' })
    expect(supabase.from).toHaveBeenCalledWith('campaign_items')
    expect(mockEq).toHaveBeenCalledWith('id', 'item-1')
    expect(result.name).toBe('Sword of Plot (Updated)')
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })
    mockEq.mockReturnValue({ select: mockSelect, single: mockSingle, eq: mockEq })
    mockSelect.mockReturnValue({ single: mockSingle })
    await expect(updateCampaignItem('item-1', { name: 'X' })).rejects.toThrow('update failed')
  })
})

describe('deleteCampaignItem', () => {
  it('deletes a campaign item by id', async () => {
    mockEq.mockResolvedValue({ error: null })
    await deleteCampaignItem('item-1')
    expect(supabase.from).toHaveBeenCalledWith('campaign_items')
    expect(mockEq).toHaveBeenCalledWith('id', 'item-1')
  })

  it('throws on error', async () => {
    mockEq.mockResolvedValue({ error: { message: 'delete failed' } })
    await expect(deleteCampaignItem('item-1')).rejects.toThrow('delete failed')
  })
})
