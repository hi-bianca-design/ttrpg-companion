import { buildGmOrder, buildPlayerOrder, reorderTarget, selectGroup, toggleSelected, type GmEnemyRow } from '@/features/combat/battleOrder'
import { TEMP_HP_LABEL } from '@/features/combat/copy'
import { character, combat, enemy, entry, orderRow } from '../../helpers/combat'

const mira = character('c1', 'Mira', { hp: { current: 15, max: 30, temp: 4 }, conditions: ['poisoned'], owner: 'u1' })
const bram = character('c2', 'Bram', { owner: 'u2' })
const party = [mira, bram]

test('the temp hit points label is the owner’s wording', () => {
  expect(TEMP_HP_LABEL).toBe('Temp HP')
})

describe('buildPlayerOrder', () => {
  const order = [
    orderRow({ id: 'e2', kind: 'enemy', name: 'Goblin 1', initiative: 12, position: 2 }),
    orderRow({ id: 'p1', kind: 'player', user_id: 'u1', character_id: 'c1', initiative: 18, position: 1 }),
    orderRow({ id: 'p3', kind: 'player', user_id: 'u3', character_id: 'gone', initiative: null, position: 3 }),
  ]

  test('rows follow position; a hidden turn holder leaves no trace (the pointer simply stays put)', () => {
    const out = buildPlayerOrder({ combat: combat({ gm_turn: true, round: 3 }), order, party, userId: 'u1' })
    expect(out.round).toBe(3)
    expect(Object.keys(out).sort()).toEqual(['round', 'rows'])
    expect(out.rows.map((r) => r.id)).toEqual(['p1', 'e2', 'p3'])
    expect(JSON.stringify(out)).not.toContain('hidden-ogre')
  })

  test('an enemy row has exactly the player-safe keys', () => {
    const out = buildPlayerOrder({ combat: combat(), order, party, userId: 'u1' })
    const goblin = out.rows.find((r) => r.id === 'e2')!
    expect(Object.keys(goblin).sort()).toEqual(['id', 'initiative', 'isCurrent', 'kind', 'name'])
  })

  test('hostile extra columns on an order row never reach an enemy row', () => {
    const hostile = { ...order[0], hp: 7, max_hp: 7, ac: 13, notes: 'secret', hidden: true } as never
    const out = buildPlayerOrder({ combat: combat(), order: [hostile], party, userId: 'u1' })
    expect(Object.keys(out.rows[0]).sort()).toEqual(['id', 'initiative', 'isCurrent', 'kind', 'name'])
    expect(JSON.stringify(out)).not.toContain('secret')
  })

  test('a player row joins the party cache: name, hit points, temp, conditions', () => {
    const out = buildPlayerOrder({ combat: combat(), order, party, userId: 'u1' })
    const row = out.rows[0]
    expect(row).toMatchObject({
      kind: 'player', name: 'Mira', characterId: 'c1', userId: 'u1', subtitle: 'Rogue · Level 3', initiative: 18,
      hp: { current: 15, max: 30, temp: 4 }, conditions: ['poisoned'],
    })
  })

  test('a character missing from the cache is "Player" with no hit points', () => {
    const out = buildPlayerOrder({ combat: combat(), order, party, userId: 'u1' })
    expect(out.rows[2]).toMatchObject({ name: 'Player', hp: null, conditions: [], subtitle: null })
  })

  test('isMine only for the viewer, isCurrent follows turn_entry_id', () => {
    const out = buildPlayerOrder({ combat: combat({ turn_entry_id: 'e2' }), order, party, userId: 'u1' })
    expect(out.rows.map((r) => ('isMine' in r ? r.isMine : null))).toEqual([true, null, false])
    expect(out.rows.map((r) => r.isCurrent)).toEqual([false, true, false])
  })

  test('nobody is mine without a signed-in user', () => {
    const out = buildPlayerOrder({ combat: combat(), order, party, userId: undefined })
    expect(out.rows.every((r) => !('isMine' in r) || !r.isMine)).toBe(true)
  })
})

describe('buildGmOrder', () => {
  const entries = [
    enemy({ id: 'g1', name: 'Goblin 1', group_id: 'grp', position: 2, hp: 0, max_hp: 7, initiative: 12 }),
    entry({ id: 'p1', kind: 'player', user_id: 'u1', character_id: 'c1', position: 1, initiative: 18, is_current: true }),
    enemy({ id: 'o1', name: 'Ogre', hidden: true, position: 3, hp: 30, max_hp: 59, temp_hp: 5, ac: 11, notes: 'weak to fire' }),
  ]

  test('rows follow position, keep hidden enemies, expose currentId and isDown', () => {
    const out = buildGmOrder({ combat: combat({ round: 2 }), entries, party, userId: 'gm' })
    expect(out.round).toBe(2)
    expect(out.currentId).toBe('p1')
    expect(out.rows.map((r) => r.id)).toEqual(['p1', 'g1', 'o1'])
    const [, goblin, ogre] = out.rows as [unknown, GmEnemyRow, GmEnemyRow]
    expect(goblin).toMatchObject({ isDown: true, hp: 0, maxHp: 7, groupId: 'grp', hidden: false })
    expect(ogre).toMatchObject({ hidden: true, tempHp: 5, ac: 11, notes: 'weak to fire', isDown: false, isCurrent: false })
  })

  test('a player row is the same PlayerRow the players see, with no edit fields', () => {
    const out = buildGmOrder({ combat: combat(), entries, party, userId: 'gm' })
    const mine = buildPlayerOrder({
      combat: combat(), order: [orderRow({ id: 'p1', user_id: 'u1', character_id: 'c1', initiative: 18 })], party, userId: 'gm',
    }).rows[0]
    expect(out.rows[0]).toEqual({ ...mine, isCurrent: true })
  })

  test('no current entry gives a null currentId', () => {
    const out = buildGmOrder({ combat: combat(), entries: entries.map((e) => ({ ...e, is_current: false })), party, userId: 'gm' })
    expect(out.currentId).toBeNull()
  })
})

describe('selection helpers', () => {
  const rows = [1, 2, 3, 4].map((n) => enemy({ id: `g${n}`, group_id: 'grp' }))
    .concat([enemy({ id: 'g5', group_id: 'later' }), enemy({ id: 'solo' })])
    .map((e) => buildGmOrder({ combat: combat(), entries: [e], party, userId: 'gm' }).rows[0] as GmEnemyRow)

  test('selectGroup returns the group and not another group’s goblin', () => {
    expect(selectGroup(rows, 'g2')).toEqual(['g1', 'g2', 'g3', 'g4'])
  })

  test('selectGroup of a lone enemy is just itself', () => {
    expect(selectGroup(rows, 'solo')).toEqual(['solo'])
  })

  test('toggleSelected adds then removes without mutating its input', () => {
    const empty: ReadonlySet<string> = new Set()
    const one = toggleSelected(empty, 'a')
    expect([...one]).toEqual(['a'])
    expect(empty.size).toBe(0)
    expect([...toggleSelected(one, 'a')]).toEqual([])
    expect(one.size).toBe(1)
  })
})

describe('reorderTarget', () => {
  test('dragging row 2 down two and a bit rows lands on 4', () => {
    expect(reorderTarget(2, 130, 64, 8)).toBe(4)
  })
  test('negative offsets move up', () => {
    expect(reorderTarget(4, -130, 64, 8)).toBe(2)
  })
  test('results clamp to 1 and count', () => {
    expect(reorderTarget(1, -500, 64, 8)).toBe(1)
    expect(reorderTarget(7, 900, 64, 8)).toBe(8)
  })
  test('a small drag stays put', () => {
    expect(reorderTarget(3, 20, 64, 8)).toBe(3)
  })
})
