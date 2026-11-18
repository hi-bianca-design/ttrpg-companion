import type { CharacterFull } from '@/features/characters/characters.api'
import type { Encounter } from '@/features/encounters/encounters.api'
import type { DraftRow } from '@/features/combat/reviewDraft'
import { buildDraft, launchInput, moveBy, moveRow, toggleHidden } from '@/features/combat/reviewDraft'

const party = [
  { id: 'c1', name: 'Aria' },
  { id: 'c2', name: 'Borin' },
] as unknown as CharacterFull[]

function enemy(id: string, name: string, count: number, hidden = false) {
  return { id, name, count, hidden, max_hp: 10, position: 0 }
}

function encounter(id: string, enemies: ReturnType<typeof enemy>[]) {
  return { id, enemies } as unknown as Encounter
}

const wolves = encounter('e1', [enemy('ew1', 'Wolf', 3)])

describe('buildDraft', () => {
  it('lists players first, then enemies expanded into numbered copies', () => {
    const rows = buildDraft({ party, encounters: [wolves] })
    expect(rows.map((r) => r.key)).toEqual([
      'player:c1', 'player:c2', 'enemy:ew1:1', 'enemy:ew1:2', 'enemy:ew1:3',
    ])
    expect(rows.map((r) => r.name)).toEqual(['Aria', 'Borin', 'Wolf 1', 'Wolf 2', 'Wolf 3'])
    expect(rows[0]).toEqual({ key: 'player:c1', kind: 'player', name: 'Aria', hidden: false, encounterId: null })
    expect(rows[2].encounterId).toBe('e1')
  })

  it('keeps the bare name for a count of 1', () => {
    const rows = buildDraft({ party: [], encounters: [encounter('e1', [enemy('eb', 'Boss', 1)])] })
    expect(rows).toEqual([{ key: 'enemy:eb:1', kind: 'enemy', name: 'Boss', hidden: false, encounterId: 'e1' }])
  })

  it('initialises hidden from the encounter enemy and keeps encounter order', () => {
    const rows = buildDraft({
      party: [],
      encounters: [encounter('e1', [enemy('a', 'A', 2, true)]), encounter('e2', [enemy('b', 'B', 1)])],
    })
    expect(rows.map((r) => [r.key, r.hidden])).toEqual([
      ['enemy:a:1', true], ['enemy:a:2', true], ['enemy:b:1', false],
    ])
  })
})

describe('moveRow / moveBy', () => {
  const rows = (): DraftRow[] => buildDraft({ party, encounters: [wolves] })

  it('clamps a far index to the last position', () => {
    expect(moveRow(rows(), 'player:c1', 99).map((r) => r.key)).toEqual([
      'player:c2', 'enemy:ew1:1', 'enemy:ew1:2', 'enemy:ew1:3', 'player:c1',
    ])
  })

  it('clamps a negative index to the first position', () => {
    expect(moveRow(rows(), 'enemy:ew1:3', -5)[0].key).toBe('enemy:ew1:3')
  })

  it('does not mutate and ignores unknown keys', () => {
    const input = rows()
    const snapshot = [...input]
    moveRow(input, 'player:c1', 3)
    expect(input).toEqual(snapshot)
    expect(moveRow(input, 'nope', 2)).toEqual(snapshot)
  })

  it('moveBy -1 on the first row is a no-op and +1 on the last too', () => {
    const input = rows()
    expect(moveBy(input, 'player:c1', -1)).toEqual(input)
    expect(moveBy(input, 'enemy:ew1:3', 1)).toEqual(input)
  })

  it('moveBy matches moveRow for adjacent moves', () => {
    const input = rows()
    expect(moveBy(input, 'player:c2', -1)).toEqual(moveRow(input, 'player:c2', 0))
    expect(moveBy(input, 'player:c2', 1)).toEqual(moveRow(input, 'player:c2', 2))
  })
})

describe('toggleHidden', () => {
  it('flips an enemy and ignores players', () => {
    const input = buildDraft({ party, encounters: [wolves] })
    const flipped = toggleHidden(input, 'enemy:ew1:2')
    expect(flipped.find((r) => r.key === 'enemy:ew1:2')?.hidden).toBe(true)
    expect(input.find((r) => r.key === 'enemy:ew1:2')?.hidden).toBe(false)
    expect(toggleHidden(input, 'player:c1')).toEqual(input)
  })
})

describe('launchInput', () => {
  it('returns order, hidden keys for hidden rows only, and distinct encounter ids', () => {
    const input = toggleHidden(
      buildDraft({ party, encounters: [wolves, encounter('e2', [enemy('eg', 'Goblin', 1)])] }),
      'enemy:ew1:3',
    )
    expect(launchInput(input)).toEqual({
      encounterIds: ['e1', 'e2'],
      order: ['player:c1', 'player:c2', 'enemy:ew1:1', 'enemy:ew1:2', 'enemy:ew1:3', 'enemy:eg:1'],
      hiddenKeys: ['enemy:ew1:3'],
    })
  })

  it('gives no encounter ids with zero encounters', () => {
    expect(launchInput(buildDraft({ party, encounters: [] }))).toEqual({
      encounterIds: [], order: ['player:c1', 'player:c2'], hiddenKeys: [],
    })
  })
})
