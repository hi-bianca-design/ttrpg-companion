import {
  getUserContent,
  createUserContent,
  updateUserContent,
  deleteUserContent,
  getSpeciesAll,
  getBackgroundsAll,
  getSpellsAll,
} from '@/modules/user_content/user_content.service'
import { ContentType } from '@/modules/user_content/user_content.types'

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
    })),
  },
}))

jest.mock('@/modules/srd/srd.service', () => ({
  getSpecies: jest.fn(),
  getBackgrounds: jest.fn(),
  getSpellsForClass: jest.fn(),
}))

import { supabase } from '@/lib/supabase'
import { getSpecies, getBackgrounds, getSpellsForClass } from '@/modules/srd/srd.service'

beforeEach(() => {
  jest.clearAllMocks()
  mockEq.mockReturnValue({ order: mockOrder, single: mockSingle, eq: mockEq, select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockSingle.mockResolvedValue({ data: null, error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: mockEq })
  mockInsert.mockReturnValue({ select: mockSelect })
})

describe('getUserContent', () => {
  it('queries user_content filtered by user_id', async () => {
    await getUserContent('user-1')
    expect(supabase.from).toHaveBeenCalledWith('user_content')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('throws when Supabase returns an error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await expect(getUserContent('user-1')).rejects.toThrow('DB error')
  })
})

describe('createUserContent', () => {
  it('inserts into user_content and returns the new row', async () => {
    const row = { id: 'uc1', user_id: 'user-1', content_type: 'spell' as ContentType, name: 'Fireball', description: null, properties: {}, created_at: '' }
    mockSingle.mockResolvedValue({ data: row, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })
    const result = await createUserContent('user-1', { content_type: 'spell', name: 'Fireball', description: null, properties: {} })
    expect(supabase.from).toHaveBeenCalledWith('user_content')
    expect(result.name).toBe('Fireball')
  })

  it('throws when insert fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
    mockSelect.mockReturnValue({ single: mockSingle })
    await expect(
      createUserContent('user-1', { content_type: 'spell', name: 'Test', description: null, properties: {} })
    ).rejects.toThrow('Insert failed')
  })
})

describe('updateUserContent', () => {
  it('updates the record and returns the updated row', async () => {
    const row = { id: 'uc1', user_id: 'user-1', content_type: 'spell' as ContentType, name: 'Updated', description: null, properties: {}, created_at: '' }
    mockSingle.mockResolvedValue({ data: row, error: null })
    mockEq.mockReturnValue({ select: mockSelect, single: mockSingle, eq: mockEq, order: mockOrder })
    mockSelect.mockReturnValue({ single: mockSingle })
    const result = await updateUserContent('uc1', { name: 'Updated', description: null, properties: {} })
    expect(supabase.from).toHaveBeenCalledWith('user_content')
    expect(result.name).toBe('Updated')
  })
})

describe('deleteUserContent', () => {
  it('calls delete on user_content with the id', async () => {
    mockEq.mockResolvedValue({ error: null })
    await deleteUserContent('uc1')
    expect(supabase.from).toHaveBeenCalledWith('user_content')
    expect(mockEq).toHaveBeenCalledWith('id', 'uc1')
  })

  it('throws when delete fails', async () => {
    mockEq.mockResolvedValue({ error: { message: 'Delete failed' } })
    await expect(deleteUserContent('uc1')).rejects.toThrow('Delete failed')
  })
})

describe('getSpeciesAll', () => {
  it('merges SRD species with custom species', async () => {
    const srdSpecies = [{ id: 's1', name: 'Human', speed: 30, traits: {}, ability_score_bonuses: {} }]
    const customContent = [{
      id: 'uc1', user_id: 'user-1', content_type: 'species' as ContentType,
      name: 'Catfolk', description: 'A cat-like humanoid',
      properties: { speed: 35, traits: ['Darkvision'] }, created_at: '',
    }]
    ;(getSpecies as jest.Mock).mockResolvedValue(srdSpecies)
    mockOrder.mockResolvedValue({ data: customContent, error: null })

    const result = await getSpeciesAll('user-1')
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Human')
    expect(result[0].is_custom).toBeFalsy()
    expect(result[1].name).toBe('Catfolk')
    expect(result[1].is_custom).toBe(true)
    expect(result[1].speed).toBe(35)
  })
})

describe('getBackgroundsAll', () => {
  it('merges SRD backgrounds with custom backgrounds', async () => {
    const srdBgs = [{ id: 'bg1', name: 'Acolyte', skill_proficiencies: ['Insight'], ability_score_options: {}, description: null, feature: null }]
    const customContent = [{
      id: 'uc2', user_id: 'user-1', content_type: 'background' as ContentType,
      name: 'Wanderer', description: null,
      properties: { skill_proficiencies: ['Survival', 'Athletics'], feature: 'Know the land' }, created_at: '',
    }]
    ;(getBackgrounds as jest.Mock).mockResolvedValue(srdBgs)
    mockOrder.mockResolvedValue({ data: customContent, error: null })

    const result = await getBackgroundsAll('user-1')
    expect(result).toHaveLength(2)
    expect(result[1].name).toBe('Wanderer')
    expect(result[1].is_custom).toBe(true)
    expect(result[1].skill_proficiencies).toEqual(['Survival', 'Athletics'])
  })
})

describe('getSpellsAll', () => {
  it('merges SRD spells with custom spells for the given class', async () => {
    const srdSpells = [{
      id: 'sp1', name: 'Magic Missile', level: 1, school: 'Evocation',
      casting_time: 'Action', range: '120 ft', components: 'V, S',
      duration: 'Instantaneous', description: '', classes: ['wizard'],
      is_ritual: false, requires_concentration: false,
    }]
    const allCustom = [
      {
        id: 'uc3', user_id: 'user-1', content_type: 'spell' as ContentType,
        name: 'Custom Bolt', description: 'A custom bolt',
        properties: { level: 2, school: 'Evocation', casting_time: 'Action', range: '60 ft', components: 'V', duration: 'Instantaneous', classes: ['wizard'], is_ritual: false, requires_concentration: false },
        created_at: '',
      },
      {
        id: 'uc4', user_id: 'user-1', content_type: 'species' as ContentType,
        name: 'Elf', description: null, properties: { speed: 30, traits: [] }, created_at: '',
      },
    ]
    ;(getSpellsForClass as jest.Mock).mockResolvedValue(srdSpells)
    mockOrder.mockResolvedValue({ data: allCustom, error: null })

    const result = await getSpellsAll('user-1', 'Wizard')
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Magic Missile')
    expect(result[1].name).toBe('Custom Bolt')
    expect(result[1].is_custom).toBe(true)
  })

  it('excludes custom spells whose classes array does not include the requested class', async () => {
    const allCustom = [{
      id: 'uc5', user_id: 'user-1', content_type: 'spell' as ContentType,
      name: 'Cleric Only', description: null,
      properties: { level: 1, school: 'Divination', casting_time: 'Action', range: 'Self', components: 'V', duration: '1 minute', classes: ['cleric'], is_ritual: false, requires_concentration: false },
      created_at: '',
    }]
    ;(getSpellsForClass as jest.Mock).mockResolvedValue([])
    mockOrder.mockResolvedValue({ data: allCustom, error: null })

    const result = await getSpellsAll('user-1', 'Wizard')
    expect(result).toHaveLength(0)
  })
})
