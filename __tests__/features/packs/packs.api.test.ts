import { AppError } from '@/features/errors'
import { listMyEntitlements, listPacks } from '@/features/packs/packs.api'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}))

import { supabase } from '@/lib/supabase'

function builder(result: unknown) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'order']) b[m] = jest.fn(() => b)
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
  return b as Record<string, jest.Mock> & { then: unknown }
}

beforeEach(() => jest.clearAllMocks())

describe('listPacks', () => {
  it('selects the catalog from packs ordered by name', async () => {
    const b = builder({ data: [{ id: 'p1', name: 'Alpha' }], error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await expect(listPacks()).resolves.toEqual([{ id: 'p1', name: 'Alpha' }])
    expect(supabase.from).toHaveBeenCalledWith('packs')
    expect(b.select).toHaveBeenCalledWith('*')
    expect(b.order).toHaveBeenCalledWith('name')
  })

  it('maps a Supabase failure to an AppError', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: null, error: { message: 'Failed to fetch' } }))
    const err = await listPacks().catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(err.code).toBe('network')
  })
})

describe('listMyEntitlements', () => {
  it('selects from pack_entitlements (RLS already limits it to the caller)', async () => {
    const b = builder({ data: [{ user_id: 'u1', pack_id: 'p1' }], error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await expect(listMyEntitlements()).resolves.toEqual([{ user_id: 'u1', pack_id: 'p1' }])
    expect(supabase.from).toHaveBeenCalledWith('pack_entitlements')
    expect(b.select).toHaveBeenCalledWith('*')
  })

  it('maps a Supabase failure to an AppError', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: null, error: { message: 'boom' } }))
    await expect(listMyEntitlements()).rejects.toBeInstanceOf(AppError)
  })
})
