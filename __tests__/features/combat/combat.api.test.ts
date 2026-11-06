import {
  newBatchId, addEncounterEnemies, addEnemies, applyEnemyHp, delayTurn, endMyTurn, getActiveCombat, getCombatEntries,
  getCombatOrder, moveEntry, nextTurn, removeEntry, setCurrentEntry, setInitiative, startCombat, startPreparedCombat,
  undoEnemyHp, updateEnemy,
} from '@/features/combat/combat.api'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}))

import { supabase } from '@/lib/supabase'

const combat = { id: 'cb1', campaign_id: 'c1', status: 'active', round: 1 }

beforeEach(() => jest.clearAllMocks())

describe('newBatchId', () => {
  it('returns distinct uuid-shaped ids', () => {
    const a = newBatchId()
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(newBatchId()).not.toBe(a)
  })
})

describe('combat rpc wrappers', () => {
  it.each([
    ['startCombat', () => startCombat('cb1'), 'start_combat', { p_combat_id: 'cb1' }],
    ['setInitiative', () => setInitiative('e1', 14), 'set_initiative', { p_entry_id: 'e1', p_initiative: 14 }],
    ['setInitiative (clear)', () => setInitiative('e1', null), 'set_initiative', { p_entry_id: 'e1', p_initiative: null }],
    ['moveEntry', () => moveEntry('e1', 3), 'move_entry', { p_entry_id: 'e1', p_to_position: 3 }],
    ['nextTurn', () => nextTurn('cb1', 'e1'), 'next_turn', { p_combat_id: 'cb1', p_expected_entry_id: 'e1' }],
    ['endMyTurn', () => endMyTurn('cb1', 3), 'end_my_turn', { p_combat_id: 'cb1', p_expected_round: 3 }],
    ['setCurrentEntry', () => setCurrentEntry('e1'), 'set_current_entry', { p_entry_id: 'e1' }],
    ['delayTurn', () => delayTurn('cb1', 'e1'), 'delay_turn', { p_combat_id: 'cb1', p_expected_entry_id: 'e1' }],
    ['updateEnemy', () => updateEnemy('e1', { hp: 4, notes: null }), 'update_enemy', { p_entry_id: 'e1', p_patch: { hp: 4, notes: null } }],
    ['removeEntry', () => removeEntry('e1'), 'remove_entry', { p_entry_id: 'e1' }],
  ])('%s calls the rpc and returns the combat', async (_name, call, fn, args) => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: combat, error: null })
    await expect(call()).resolves.toEqual(combat)
    expect(supabase.rpc).toHaveBeenCalledWith(fn, args)
  })

  it('startPreparedCombat sends the encounters, order and hidden keys and returns the combat', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: combat, error: null })
    await expect(startPreparedCombat('s1', { encounterIds: ['e1'], order: ['player:c1'], hiddenKeys: [] })).resolves.toEqual(combat)
    expect(supabase.rpc).toHaveBeenCalledWith('start_prepared_combat', {
      p_session_id: 's1', p_encounter_ids: ['e1'], p_order: ['player:c1'], p_hidden_keys: [],
    })
  })

  it('addEncounterEnemies returns the new entry ids', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: ['x1', 'x2'], error: null })
    await expect(addEncounterEnemies('cb1', 'e1')).resolves.toEqual(['x1', 'x2'])
    expect(supabase.rpc).toHaveBeenCalledWith('add_encounter_enemies', { p_combat_id: 'cb1', p_encounter_id: 'e1' })
  })

  it('startPreparedCombat surfaces a coded error', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'not_rolling', code: 'P0001' } })
    await expect(startPreparedCombat('s1', { encounterIds: [], order: [], hiddenKeys: [] })).rejects.toMatchObject({ code: 'not_rolling' })
  })

  it('addEnemies sends every field and returns the new entry ids', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: ['e1', 'e2'], error: null })
    await expect(addEnemies('cb1', { name: 'Goblin', count: 2, maxHp: 7, initiative: 15, ac: 13, notes: null, hidden: true })).resolves.toEqual(['e1', 'e2'])
    expect(supabase.rpc).toHaveBeenCalledWith('add_enemies', {
      p_combat_id: 'cb1', p_name: 'Goblin', p_count: 2, p_max_hp: 7, p_initiative: 15, p_ac: 13, p_notes: null, p_hidden: true,
      p_defense_label: undefined, p_attacks: undefined, p_xp: undefined,
    })
  })

  it('addEnemies passes the card fields: defense label, attacks and xp', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: ['e1'], error: null })
    const attacks = [{ name: 'Bite', toHit: '+4', damage: '2d4+2' }]
    await addEnemies('cb1', { name: 'Wolf', count: 1, maxHp: 11, initiative: null, ac: 13, notes: null, hidden: false, defenseLabel: 'AC', attacks, xp: 50 })
    expect(supabase.rpc).toHaveBeenCalledWith('add_enemies', expect.objectContaining({ p_defense_label: 'AC', p_attacks: attacks, p_xp: 50 }))
  })

  it('updateEnemy passes the card fields through as the patch', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: combat, error: null })
    await updateEnemy('e1', { xp: 75, conditions: ['prone'] })
    expect(supabase.rpc).toHaveBeenCalledWith('update_enemy', { p_entry_id: 'e1', p_patch: { xp: 75, conditions: ['prone'] } })
  })

  it('applyEnemyHp returns the batch id', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: 'batch-1', error: null })
    await expect(applyEnemyHp('cb1', ['e1', 'e2'], 'damage', 5, 'batch-1')).resolves.toBe('batch-1')
    expect(supabase.rpc).toHaveBeenCalledWith('apply_enemy_hp', { p_combat_id: 'cb1', p_entry_ids: ['e1', 'e2'], p_mode: 'damage', p_amount: 5, p_batch: 'batch-1' })
  })

  it('undoEnemyHp returns the number of rows restored, including 0', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: 0, error: null })
    await expect(undoEnemyHp('cb1', 'batch-1')).resolves.toBe(0)
    expect(supabase.rpc).toHaveBeenCalledWith('undo_enemy_hp', { p_combat_id: 'cb1', p_batch: 'batch-1' })
  })

  it.each([
    ['no_active_combat', 'That fight has already ended.'],
    ['not_rolling', 'Combat has already started.'],
    ['not_active', 'Combat has not started yet.'],
    ['invalid_target', "That row isn't in this fight any more."],
    ['invalid_amount', 'Enter a whole number above zero.'],
    ['invalid_mode', 'Something went wrong. Please try again.'],
    ['invalid_initiative', 'Initiative must be a whole number from -20 to 99.'],
    ['invalid_position', "That spot isn't in the order."],
    ['invalid_enemy', 'Check the enemy details: a name up to 60 characters, at least 1 hit point, armor class 0 to 40, up to 20 copies.'],
    ['invalid_patch', 'Something went wrong. Please try again.'],
    ['invalid_batch', 'Something went wrong. Please try again.'],
  ])('maps P0001 %s to its plain copy', async (message, copy) => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { code: 'P0001', message } })
    await expect(nextTurn('cb1', 'e1')).rejects.toMatchObject({ name: 'AppError', code: message, message: copy })
  })
})

function builder(result: unknown) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq']) b[m] = jest.fn(() => b)
  b.maybeSingle = jest.fn(() => Promise.resolve(result))
  b.order = jest.fn(() => Promise.resolve(result))
  return b as Record<string, jest.Mock>
}

describe('getActiveCombat', () => {
  it('selects the campaign’s combat that is not ended', async () => {
    const b = builder({ data: combat, error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await expect(getActiveCombat('c1')).resolves.toEqual(combat)
    expect(supabase.from).toHaveBeenCalledWith('combats')
    expect(b.eq).toHaveBeenCalledWith('campaign_id', 'c1')
    expect(b.neq).toHaveBeenCalledWith('status', 'ended')
  })

  it('returns null when there is none', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(builder({ data: null, error: null }))
    await expect(getActiveCombat('c1')).resolves.toBeNull()
  })
})

describe('getCombatOrder / getCombatEntries', () => {
  it.each([
    ['getCombatOrder', getCombatOrder, 'combat_order'],
    ['getCombatEntries', getCombatEntries, 'combat_entries'],
  ])('%s reads its table for the combat ordered by position', async (_name, fn, table) => {
    const rows = [{ id: 'a', position: 1 }, { id: 'b', position: 2 }]
    const b = builder({ data: rows, error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(b)
    await expect(fn('cb1')).resolves.toEqual(rows)
    expect(supabase.from).toHaveBeenCalledWith(table)
    expect(b.eq).toHaveBeenCalledWith('combat_id', 'cb1')
    expect(b.order).toHaveBeenCalledWith('position')
  })
})
