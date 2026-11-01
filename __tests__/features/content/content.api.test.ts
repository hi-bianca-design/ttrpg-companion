import { saveHomebrew, listContent, deleteHomebrew } from '@/features/content/content.api'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } },
}))

import { supabase } from '@/lib/supabase'

function builder(result: unknown) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'is', 'ilike', 'order']) b[m] = jest.fn(() => b)
  b.single = jest.fn(() => Promise.resolve(result))
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
  return b as Record<string, jest.Mock> & { then: unknown }
}


beforeEach(() => {
  jest.clearAllMocks()
  ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
})

describe('saveHomebrew', () => {
  it('rejects data that fails the kind schema without calling supabase', async () => {
    await expect(
      saveHomebrew({ systemId: 'dnd5e-2024', kind: 'class', name: 'Bad', data: { hit_die: 'not a number' } }),
    ).rejects.toThrow()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rejects unknown kinds without calling supabase', async () => {
    await expect(
      saveHomebrew({ systemId: 'dnd5e-2024', kind: 'nonsense', name: 'X', data: {} }),
    ).rejects.toThrow()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('inserts valid data with owner and a slug derived from the name', async () => {
    const b = builder({ data: { id: 'c1' }, error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    const kindData = { hit_die: 8, primary_abilities: ['dexterity'], saving_throw_proficiencies: ['dexterity'] }
    const row = await saveHomebrew({
      systemId: 'dnd5e-2024', kind: 'class', name: "Shadow  Dancer's Path!", data: kindData,
    })
    expect(row).toEqual({ id: 'c1' })
    expect(supabase.from).toHaveBeenCalledWith('content')
    expect(b.insert).toHaveBeenCalledWith(expect.objectContaining({
      owner_id: 'u1', system_id: 'dnd5e-2024', kind: 'class', name: "Shadow  Dancer's Path!", slug: 'shadow-dancers-path',
    }))
  })

  it('updates by id when one is given', async () => {
    const b = builder({ data: { id: 'c1' }, error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await saveHomebrew({
      id: 'c1', systemId: 'dnd5e-2024', kind: 'class', name: 'Renamed',
      data: { hit_die: 8, primary_abilities: [], saving_throw_proficiencies: [] },
    })
    expect(b.update).toHaveBeenCalled()
    expect(b.eq).toHaveBeenCalledWith('id', 'c1')
    expect(b.insert).not.toHaveBeenCalled()
  })
})

describe('listContent', () => {
  it('filters official content to rows without an owner', async () => {
    const b = builder({ data: [], error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await listContent({ systemId: 'dnd5e-2024', kind: 'spell', scope: 'official' })
    expect(b.eq).toHaveBeenCalledWith('system_id', 'dnd5e-2024')
    expect(b.eq).toHaveBeenCalledWith('kind', 'spell')
    expect(b.is).toHaveBeenCalledWith('owner_id', null)
  })

  it('filters mine to the caller own non-campaign rows', async () => {
    const b = builder({ data: [], error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await listContent({ systemId: 'dnd5e-2024', kind: 'spell', scope: 'mine' })
    expect(b.eq).toHaveBeenCalledWith('owner_id', 'u1')
    expect(b.is).toHaveBeenCalledWith('campaign_id', null)
  })

  it('filters by campaign and escapes search wildcards', async () => {
    const b = builder({ data: [], error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await listContent({ systemId: 'dnd5e-2024', kind: 'item', scope: { campaignId: 'camp' }, search: '50%_off' })
    expect(b.eq).toHaveBeenCalledWith('campaign_id', 'camp')
    expect(b.ilike).toHaveBeenCalledWith('name', '%50\\%\\_off%')
  })

  it('throws a mapped error when the query fails', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: null, error: { message: 'Network request failed' } }))
    await expect(listContent({ systemId: 'dnd5e-2024', kind: 'spell', scope: 'all' })).rejects.toMatchObject({ code: 'network' })
  })
})

describe('deleteHomebrew', () => {
  it('deletes by id', async () => {
    const b = builder({ error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await deleteHomebrew('c1')
    expect(b.delete).toHaveBeenCalled()
    expect(b.eq).toHaveBeenCalledWith('id', 'c1')
  })
})
