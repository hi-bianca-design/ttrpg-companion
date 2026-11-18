import {
  blankDraft, blankEnemy, clampCount, digits, draftFromEncounter, moveEnemy, toSaveInput, validateDraft,
  type EncounterDraft, type EnemyDraft,
} from '@/features/encounters/encounterForm'
import type { Encounter } from '@/features/encounters/encounters.api'

const enemy = (over: Partial<EnemyDraft> = {}): EnemyDraft => ({ ...blankEnemy(), name: 'Wolf', maxHp: '11', ...over })
const draft = (over: Partial<EncounterDraft> = {}): EncounterDraft => ({ ...blankDraft(), name: 'Ambush', ...over })

describe('blank', () => {
  test('a blank draft has no enemies and the default AC label', () => {
    expect(blankDraft().enemies).toEqual([])
    const e = blankEnemy()
    expect(e).toMatchObject({ name: '', count: '1', maxHp: '', defenseLabel: 'AC', ac: '', xp: '', attacks: [], notes: '', hidden: false })
  })
  test('each blank enemy gets its own key', () => {
    expect(blankEnemy().key).not.toBe(blankEnemy().key)
  })
})

describe('input helpers', () => {
  test('digits strips everything else', () => expect(digits('1a2-3 ')).toBe('123'))
  test('clampCount keeps 1..20 and allows empty while typing', () => {
    expect(clampCount('')).toBe('')
    expect(clampCount('0')).toBe('1')
    expect(clampCount('7')).toBe('7')
    expect(clampCount('45')).toBe('20')
    expect(clampCount('x')).toBe('')
  })
})

describe('validateDraft', () => {
  test('a name alone is valid: an encounter may have no enemies yet', () => {
    expect(validateDraft(draft()).valid).toBe(true)
  })
  test('a blank or whitespace name is invalid with a reason', () => {
    const v = validateDraft(draft({ name: '   ' }))
    expect(v.valid).toBe(false)
    expect(v.name).toMatch(/name/i)
  })
  test('a name over 80 or a note over 1000 is invalid', () => {
    expect(validateDraft(draft({ name: 'x'.repeat(81) })).name).toBeDefined()
    expect(validateDraft(draft({ name: 'x'.repeat(80) })).name).toBeUndefined()
    expect(validateDraft(draft({ storyWhy: 'x'.repeat(1001) })).storyWhy).toBeDefined()
    expect(validateDraft(draft({ storyWhy: 'x'.repeat(1000) })).valid).toBe(true)
  })
  test('an enemy needs a name and max HP of at least 1', () => {
    const v = validateDraft(draft({ enemies: [enemy({ name: ' ', maxHp: '' })] }))
    expect(v.valid).toBe(false)
    expect(v.enemies[0].name).toBeDefined()
    expect(v.enemies[0].maxHp).toBeDefined()
    expect(validateDraft(draft({ enemies: [enemy({ maxHp: '0' })] })).enemies[0].maxHp).toBeDefined()
    expect(validateDraft(draft({ enemies: [enemy()] })).valid).toBe(true)
  })
  test('count must be 1..20', () => {
    expect(validateDraft(draft({ enemies: [enemy({ count: '' })] })).enemies[0].count).toBeDefined()
    expect(validateDraft(draft({ enemies: [enemy({ count: '21' })] })).enemies[0].count).toBeDefined()
    expect(validateDraft(draft({ enemies: [enemy({ count: '20' })] })).valid).toBe(true)
  })
  test('AC is optional but 0..40; XP is optional; label is at most 12 when AC is set', () => {
    expect(validateDraft(draft({ enemies: [enemy({ ac: '41' })] })).enemies[0].ac).toBeDefined()
    expect(validateDraft(draft({ enemies: [enemy({ ac: '0' })] })).valid).toBe(true)
    expect(validateDraft(draft({ enemies: [enemy({ xp: '' })] })).valid).toBe(true)
    expect(validateDraft(draft({ enemies: [enemy({ ac: '13', defenseLabel: 'x'.repeat(13) })] })).enemies[0].defenseLabel).toBeDefined()
  })
  test('notes over 500 are invalid', () => {
    expect(validateDraft(draft({ enemies: [enemy({ notes: 'x'.repeat(501) })] })).enemies[0].notes).toBeDefined()
  })
  test('an attack needs a name; more than six attacks is invalid; to-hit and damage may be empty', () => {
    const atk = { name: 'Bite', toHit: '', damage: '' }
    expect(validateDraft(draft({ enemies: [enemy({ attacks: [atk] })] })).valid).toBe(true)
    const v = validateDraft(draft({ enemies: [enemy({ attacks: [{ ...atk, name: ' ' }] })] }))
    expect(v.valid).toBe(false)
    expect(v.enemies[0].attacks[0].name).toBeDefined()
    expect(validateDraft(draft({ enemies: [enemy({ attacks: Array(7).fill(atk) })] })).enemies[0].tooManyAttacks).toBeDefined()
  })
  test('more than 30 enemy rows is invalid', () => {
    expect(validateDraft(draft({ enemies: Array.from({ length: 31 }, () => enemy()) })).tooManyEnemies).toBeDefined()
  })
  test('any invalid enemy invalidates the whole draft', () => {
    expect(validateDraft(draft({ enemies: [enemy(), enemy({ name: '' })] })).valid).toBe(false)
  })
})

describe('toSaveInput', () => {
  test('trims, nulls blanks, numbers the fields, keeps list order', () => {
    const input = toSaveInput(draft({
      name: '  Ambush ', storyBefore: ' ', storyWhy: ' why ', storyAfter: '',
      enemies: [
        enemy({ name: ' Wolf ', count: '3', maxHp: '11', ac: '13', defenseLabel: ' ', xp: '50', notes: ' pack ', hidden: true, attacks: [{ name: ' Bite ', toHit: ' +4', damage: '2d4+2 ' }] }),
        enemy({ name: 'Rat', maxHp: '2' }),
      ],
    }))
    expect(input).toEqual({
      name: 'Ambush', storyBefore: null, storyWhy: 'why', storyAfter: null,
      enemies: [
        { name: 'Wolf', count: 3, max_hp: 11, defense_label: 'AC', ac: 13, xp: 50, notes: 'pack', hidden: true, attacks: [{ name: 'Bite', toHit: '+4', damage: '2d4+2' }] },
        { name: 'Rat', count: 1, max_hp: 2, defense_label: null, ac: null, xp: null, notes: null, hidden: false, attacks: [] },
      ],
    })
  })
  test('a custom label is kept when AC is set and dropped when AC is blank', () => {
    expect(toSaveInput(draft({ enemies: [enemy({ ac: '12', defenseLabel: 'Shield' })] })).enemies[0].defense_label).toBe('Shield')
    expect(toSaveInput(draft({ enemies: [enemy({ ac: '', defenseLabel: 'Shield' })] })).enemies[0].defense_label).toBeNull()
  })
})

describe('moveEnemy', () => {
  const rows = [enemy({ name: 'A' }), enemy({ name: 'B' }), enemy({ name: 'C' })]
  const names = (r: EnemyDraft[]) => r.map((e) => e.name).join('')
  test('moves up and down without mutating', () => {
    expect(names(moveEnemy(rows, 1, -1))).toBe('BAC')
    expect(names(moveEnemy(rows, 1, 1))).toBe('ACB')
    expect(names(rows)).toBe('ABC')
  })
  test('does nothing at the edges', () => {
    expect(names(moveEnemy(rows, 0, -1))).toBe('ABC')
    expect(names(moveEnemy(rows, 2, 1))).toBe('ABC')
  })
})

describe('draftFromEncounter', () => {
  const enc = {
    id: 'e1', campaign_id: 'c1', name: 'Ambush', story_before: 'b', story_why: null, story_after: 'a', created_at: '', updated_at: '',
    enemies: [{
      id: 'x1', encounter_id: 'e1', campaign_id: 'c1', name: 'Wolf', count: 3, max_hp: 11, defense_label: 'Shield', ac: 13,
      attacks: [{ name: 'Bite', toHit: '+4', damage: '2d4' }, { junk: true }], xp: 50, notes: null, hidden: true, position: 1,
    }],
  } as unknown as Encounter
  test('prefills every field as strings and drops malformed attacks', () => {
    const d = draftFromEncounter(enc)
    expect(d).toMatchObject({ name: 'Ambush', storyBefore: 'b', storyWhy: '', storyAfter: 'a' })
    expect(d.enemies[0]).toMatchObject({
      name: 'Wolf', count: '3', maxHp: '11', defenseLabel: 'Shield', ac: '13', xp: '50', notes: '', hidden: true,
      attacks: [{ name: 'Bite', toHit: '+4', damage: '2d4' }],
    })
  })
  test('an enemy without a stored label shows the default AC label', () => {
    const d = draftFromEncounter({ ...enc, enemies: [{ ...enc.enemies[0], defense_label: null, ac: null, xp: null }] })
    expect(d.enemies[0]).toMatchObject({ defenseLabel: 'AC', ac: '', xp: '' })
  })
})
