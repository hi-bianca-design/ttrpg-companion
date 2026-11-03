import { getPartyCharacters } from '@/features/party/party.api'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), auth: { getSession: jest.fn() } } }))

import { supabase } from '@/lib/supabase'

function builder(result: unknown) {
  const b: Record<string, unknown> = {}
  b.select = jest.fn(() => b)
  b.in = jest.fn(() => Promise.resolve(result))
  return b as Record<string, jest.Mock>
}

const resources = {
  hp: { current: 8, max: 12 },
  spell_slots: { tiers: {} },
  hit_dice: { current: 1, max: 1 },
  death_saves_success: { tiers: { '1': { max: 3, used: 0 } } },
  death_saves_failure: { tiers: { '1': { max: 3, used: 0 } } },
}
const stats = { strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 }

const row = (id: string, over: object = {}) => ({
  id, owner_id: 'u1', system_id: 'dnd5e-2024', name: `Hero ${id}`, level: 1, stats, resources,
  conditions: ['poisoned'], details: {}, notes: null, portrait_url: null,
  character_picks: [
    { character_id: id, content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1, content: { id: 'cls', name: 'Rogue', kind: 'class', data: {} } },
  ],
  character_items: [
    {
      id: 'it1', character_id: id, content_id: 'arm', quantity: 1, equipped: true, attuned: false, notes: null,
      content: { id: 'arm', name: 'Chain Shirt', kind: 'item', data: { properties: { armor_class: '13 + Dex modifier (max 2)' } } },
    },
  ],
  ...over,
})

beforeEach(() => jest.clearAllMocks())

describe('getPartyCharacters', () => {
  it('returns [] without a request when there are no ids', async () => {
    await expect(getPartyCharacters([])).resolves.toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('loads the characters in one request and computes derived values', async () => {
    const b = builder({ data: [row('a'), row('b')], error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    const party = await getPartyCharacters(['a', 'b'])
    expect(supabase.from).toHaveBeenCalledWith('characters')
    expect(b.select).toHaveBeenCalledWith(expect.stringContaining('character_picks'))
    expect(b.in).toHaveBeenCalledWith('id', ['a', 'b'])
    expect(party.map((c) => c.name)).toEqual(['Hero a', 'Hero b'])
    expect(party[0].conditions).toEqual(['poisoned'])
    // DEX 14 => +2, chain shirt 13 capped at +2 => 15
    expect(party[0].derived.find((d) => d.key === 'ac')?.value).toBe(15)
  })

  it('maps a request error through the shared error handling', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: null, error: { message: 'boom' } }))
    await expect(getPartyCharacters(['a'])).rejects.toMatchObject({ name: 'AppError' })
  })

  it('drops one unreadable character instead of failing the whole party', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(
      builder({ data: [row('a'), row('bad', { stats: { strength: 99 } }), row('c')], error: null }),
    )
    const party = await getPartyCharacters(['a', 'bad', 'c'])
    expect(party.map((c) => c.id)).toEqual(['a', 'c'])
  })
})

test('the party read does not select teammates’ private columns', async () => {
  const b = builder({ data: [], error: null })
  ;(supabase.from as jest.Mock).mockReturnValue(b)
  await getPartyCharacters(['c1'])
  const selected = (b.select as jest.Mock).mock.calls[0][0] as string
  expect(selected.startsWith('*')).toBe(false)
  expect(selected).not.toMatch(/\bnotes\b|portrait_url/)
  expect(selected).toContain('character_picks')
})
