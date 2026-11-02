import { AppError } from '@/features/errors'
import { saveHomebrew, listContent, deleteHomebrew } from '@/features/content/content.api'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } },
}))

import { supabase } from '@/lib/supabase'

function builder(result: unknown) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'is', 'ilike', 'order', 'or']) b[m] = jest.fn(() => b)
  b.single = jest.fn(() => Promise.resolve(result))
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
  return b as Record<string, jest.Mock> & { then: unknown }
}


beforeEach(() => {
  jest.clearAllMocks()
  ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
})

describe('saveHomebrew duplicates', () => {
  it('maps a unique violation on save to a duplicate AppError', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: null, error: { code: '23505', message: 'duplicate key' } }))
    const data = { hit_die: 8, primary_abilities: [], saving_throw_proficiencies: [] }
    const err = await saveHomebrew({ systemId: 'dnd5e-2024', kind: 'class', name: 'X', data }).catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(err.code).toBe('duplicate')
  })
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

  it('uses the slug override verbatim instead of slugifying the name', async () => {
    const b = builder({ data: { id: 'c1' }, error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await saveHomebrew({
      systemId: 'dnd5e-2024', kind: 'class', name: 'My Class', slug: 'my-class-ab12',
      data: { hit_die: 8, primary_abilities: [], saving_throw_proficiencies: [], one_off: true },
    })
    expect(b.insert).toHaveBeenCalledWith(expect.objectContaining({ slug: 'my-class-ab12' }))
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
    expect(b.or).toHaveBeenCalledWith('data->>one_off.is.null,data->>one_off.neq.true')
  })

  it('official and campaign scopes do not hide one-off rows', async () => {
    for (const scope of ['official', { campaignId: 'camp' }] as const) {
      const b = builder({ data: [], error: null })
      ;(supabase.from as jest.Mock).mockReturnValue(b)
      await listContent({ systemId: 'dnd5e-2024', kind: 'class', scope })
      expect(b.or).not.toHaveBeenCalled()
    }
  })

  it('filters by campaign and escapes search wildcards', async () => {
    const b = builder({ data: [], error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await listContent({ systemId: 'dnd5e-2024', kind: 'item', scope: { campaignId: 'camp' }, search: '50%_off' })
    expect(b.eq).toHaveBeenCalledWith('campaign_id', 'camp')
    expect(b.ilike).toHaveBeenCalledWith('name', '%50\\%\\_off%')
  })

  it('pickable matches can_reference_content: official, mine, and campaign rows of my campaigns', async () => {
    const content = builder({ data: [], error: null })
    const campaigns = builder({ data: [{ id: 'camp1' }, { id: 'camp2' }], error: null })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'campaigns' ? campaigns : content))
    await listContent({ systemId: 'dnd5e-2024', kind: 'spell', scope: 'pickable' })
    expect(campaigns.select).toHaveBeenCalledWith('id')
    expect(content.or).toHaveBeenCalledWith('owner_id.is.null,owner_id.eq.u1,campaign_id.in.(camp1,camp2)')
    expect(content.or).toHaveBeenCalledWith('data->>one_off.is.null,data->>one_off.neq.true')
  })

  it('pickable without campaigns is official plus mine only (no sheet-visible homebrew of others)', async () => {
    const content = builder({ data: [], error: null })
    const campaigns = builder({ data: [], error: null })
    ;(supabase.from as jest.Mock).mockImplementation((t: string) => (t === 'campaigns' ? campaigns : content))
    await listContent({ systemId: 'dnd5e-2024', kind: 'spell', scope: 'pickable' })
    expect(content.or).toHaveBeenCalledWith('owner_id.is.null,owner_id.eq.u1')
  })

  it('throws a mapped error when the query fails', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: null, error: { message: 'Network request failed' } }))
    await expect(listContent({ systemId: 'dnd5e-2024', kind: 'spell', scope: 'official' })).rejects.toMatchObject({ code: 'network' })
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

  it('maps a foreign-key violation (still on a character) to an in_use AppError', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ error: { code: '23503', message: 'violates foreign key constraint' } }))
    const err = await deleteHomebrew('c1').catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(err.code).toBe('in_use')
    expect(err.message).toBe('This is used by a character. Remove it from them first.')
  })
})
