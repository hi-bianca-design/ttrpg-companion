import { searchIndex, type SearchResult } from '@/features/search/search'

const item = (name: string, kind = 'spell'): SearchResult => ({ id: name, kind, name, summary: null, group: 'SRD' })

describe('searchIndex', () => {
  test('a prefix match ranks above a substring match', () => {
    const items = [item('Wildfire'), item('Fireball'), item('Firebolt')]
    expect(searchIndex(items, 'fire').map((r) => r.name)).toEqual(['Fireball', 'Firebolt', 'Wildfire'])
  })
  test('is case-insensitive and ignores non-matches', () => {
    expect(searchIndex([item('Fireball'), item('Shield')], '  FIRE ').map((r) => r.name)).toEqual(['Fireball'])
  })
  test('empty or whitespace query returns []', () => {
    expect(searchIndex([item('Fireball')], '')).toEqual([])
    expect(searchIndex([item('Fireball')], '   ')).toEqual([])
  })
  test('limit is respected, default 30', () => {
    const many = Array.from({ length: 50 }, (_, i) => item(`Fire ${i}`))
    expect(searchIndex(many, 'fire', 5)).toHaveLength(5)
    expect(searchIndex(many, 'fire')).toHaveLength(30)
  })
  test('matches the description too, ranked below name matches', () => {
    const a: SearchResult = { ...item('Zap'), summary: 'hurls fire' }
    expect(searchIndex([a, item('Wildfire')], 'fire').map((r) => r.name)).toEqual(['Wildfire', 'Zap'])
  })
})
