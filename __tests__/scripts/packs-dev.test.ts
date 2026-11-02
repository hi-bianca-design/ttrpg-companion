import { assertLocalUrl, createSample, grantPack, parseArgs, SAMPLE_PACK_SLUG } from '../../scripts/packs-dev'

type Result = { data?: unknown; error?: unknown }

/** A Supabase client double: each table has a queue of results, one consumed per awaited query. */
function fakeDb(queues: Record<string, Result[]>) {
  const calls: { table: string; method: string; args: unknown[] }[] = []
  const from = jest.fn((table: string) => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'upsert', 'insert', 'single']) {
      b[m] = jest.fn((...args: unknown[]) => { calls.push({ table, method: m, args }); return b })
    }
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(queues[table]?.shift() ?? { data: null, error: null }).then(res, rej)
    return b
  })
  return { db: { from } as never, calls }
}

describe('assertLocalUrl', () => {
  it.each(['http://127.0.0.1:54321', 'http://localhost:54321', 'http://[::1]:54321'])('accepts %s', (url) => {
    expect(() => assertLocalUrl(url)).not.toThrow()
  })

  it.each([
    'https://abcdefgh.supabase.co',
    'http://localhost.evil.com',
    'http://127.0.0.1.evil.com',
    'not a url',
    '',
    undefined,
  ])('refuses %s', (url) => {
    expect(() => assertLocalUrl(url)).toThrow(/local/i)
  })
})

describe('parseArgs', () => {
  it('parses create-sample', () => {
    expect(parseArgs(['create-sample'])).toEqual({ cmd: 'create-sample' })
  })

  it('parses grant with a permanent entitlement by default', () => {
    expect(parseArgs(['grant', 'mira', 'ember-court'])).toEqual({
      cmd: 'grant', username: 'mira', packSlug: 'ember-court', expiresAt: null,
    })
  })

  it('parses --expires into an ISO timestamp', () => {
    expect(parseArgs(['grant', 'mira', 'ember-court', '--expires', '2026-01-01'])).toEqual({
      cmd: 'grant', username: 'mira', packSlug: 'ember-court', expiresAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it.each([[[]], [['nope']], [['grant']], [['grant', 'mira']], [['grant', 'mira', 'p', '--expires']], [['grant', 'mira', 'p', '--expires', 'soon']]])(
    'rejects %j with a usage message', (argv) => {
      expect(() => parseArgs(argv as string[])).toThrow(/usage/i)
    },
  )
})

describe('grantPack', () => {
  it('upserts a grant entitlement for the resolved user and pack', async () => {
    const { db, calls } = fakeDb({
      profiles: [{ data: { id: 'u1' } }],
      packs: [{ data: { id: 'p1' } }],
      pack_entitlements: [{ error: null }],
    })
    await grantPack(db, { cmd: 'grant', username: 'mira', packSlug: 'ember-court', expiresAt: null })
    const upsert = calls.find((c) => c.table === 'pack_entitlements' && c.method === 'upsert')!
    expect(upsert.args).toEqual([
      { user_id: 'u1', pack_id: 'p1', source: 'grant', expires_at: null },
      { onConflict: 'user_id,pack_id' },
    ])
  })

  it('names the missing user instead of granting', async () => {
    const { db, calls } = fakeDb({ profiles: [{ data: null, error: { message: 'no rows' } }] })
    await expect(grantPack(db, { cmd: 'grant', username: 'ghost', packSlug: 'p', expiresAt: null })).rejects.toThrow(/ghost/)
    expect(calls.some((c) => c.table === 'pack_entitlements')).toBe(false)
  })

  it('names the missing pack instead of granting', async () => {
    const { db, calls } = fakeDb({ profiles: [{ data: { id: 'u1' } }], packs: [{ data: null, error: { message: 'no rows' } }] })
    await expect(grantPack(db, { cmd: 'grant', username: 'mira', packSlug: 'nope', expiresAt: null })).rejects.toThrow(/nope/)
    expect(calls.some((c) => c.table === 'pack_entitlements')).toBe(false)
  })
})

describe('createSample', () => {
  it('upserts the sample pack on slug and inserts its item rows tagged with the pack id', async () => {
    const { db, calls } = fakeDb({
      packs: [{ data: { id: 'p1' } }],
      content: [{ data: [] }, { error: null }],
    })
    await createSample(db)
    const upsert = calls.find((c) => c.table === 'packs' && c.method === 'upsert')!
    expect(upsert.args[0]).toMatchObject({ slug: SAMPLE_PACK_SLUG, published: true })
    expect(upsert.args[1]).toEqual({ onConflict: 'slug' })
    const insert = calls.find((c) => c.table === 'content' && c.method === 'insert')!
    const rows = insert.args[0] as { pack_id: string; owner_id?: unknown }[]
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.pack_id === 'p1' && r.owner_id === undefined)).toBe(true)
  })

  it('is idempotent: rows that already exist are not inserted again', async () => {
    const { db, calls } = fakeDb({
      packs: [{ data: { id: 'p1' } }],
      content: [{ data: [{ slug: 'dev-sample-lantern' }, { slug: 'dev-sample-dagger' }] }],
    })
    await createSample(db)
    expect(calls.some((c) => c.table === 'content' && c.method === 'insert')).toBe(false)
  })
})
