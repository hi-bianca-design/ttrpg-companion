import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { unwrap } from '@/features/errors'

export type Combat = Database['public']['Tables']['combats']['Row']
/** What a player may see of the order: names and positions only, never hit points or hidden rows. */
export type OrderRow = Database['public']['Tables']['combat_order']['Row']
/** The GM's truth (enemy hit points, armor class, notes, hidden). Readable by the GM only. */
export type CombatEntry = Database['public']['Tables']['combat_entries']['Row']

/** One attack on an enemy's card. Free text: the GM types "+4" and "2d4+2" as they appear in the book. */
export type Attack = { name: string; toHit: string; damage: string }

export type NewEnemy = {
  name: string
  count: number
  maxHp: number
  initiative: number | null
  ac: number | null
  notes: string | null
  hidden: boolean
  /** Optional: omitted fields take the server defaults (no label, no attacks, no xp). */
  defenseLabel?: string | null
  attacks?: Attack[]
  xp?: number | null
}

export type EnemyPatch = Partial<{
  name: string
  max_hp: number
  hp: number
  ac: number | null
  notes: string | null
  hidden: boolean
  defense_label: string | null
  attacks: Attack[]
  xp: number | null
  conditions: string[]
}>

export type HpMode = 'damage' | 'heal' | 'temp'

/** The campaign's combat that has not ended (rolling or active), or null. */
export async function getActiveCombat(campaignId: string): Promise<Combat | null> {
  const res = await supabase
    .from('combats')
    .select('*')
    .eq('campaign_id', campaignId)
    .neq('status', 'ended')
    .maybeSingle()
  return unwrap(res) ?? null
}

/** The player-safe order, by position. Empty while the combat is rolling. */
export async function getCombatOrder(combatId: string): Promise<OrderRow[]> {
  const res = await supabase.from('combat_order').select('*').eq('combat_id', combatId).order('position')
  return unwrap(res)
}

/** Every entry including enemies and hidden ones, by position. The GM only (row-level security). */
export async function getCombatEntries(combatId: string): Promise<CombatEntry[]> {
  const res = await supabase.from('combat_entries').select('*').eq('combat_id', combatId).order('position')
  return unwrap(res)
}

/** GM only: locks the roll call in. */
export async function startCombat(combatId: string): Promise<Combat> {
  return unwrap(await supabase.rpc('start_combat', { p_combat_id: combatId }))
}

/** GM only. `null` clears the number. */
export async function setInitiative(entryId: string, initiative: number | null): Promise<Combat> {
  // Generated Args can't express a nullable parameter; the function accepts null to clear.
  return unwrap(await supabase.rpc('set_initiative', { p_entry_id: entryId, p_initiative: initiative as number }))
}

/** GM only: moves a row to a 1-based position. */
export async function moveEntry(entryId: string, toPosition: number): Promise<Combat> {
  return unwrap(await supabase.rpc('move_entry', { p_entry_id: entryId, p_to_position: toPosition }))
}

/** GM only. A stale tap (expected entry is no longer current) is a server no-op; refetch. */
export async function nextTurn(combatId: string, expectedEntryId: string): Promise<Combat> {
  return unwrap(await supabase.rpc('next_turn', { p_combat_id: combatId, p_expected_entry_id: expectedEntryId }))
}

/**
 * The turn holder passes the turn to the next row. `expectedRound` is the round the screen showed: if
 * the round has moved on (a double tap across a wrap) the server does nothing and the client refetches.
 */
export async function endMyTurn(combatId: string, expectedRound: number): Promise<Combat> {
  return unwrap(await supabase.rpc('end_my_turn', { p_combat_id: combatId, p_expected_round: expectedRound }))
}

/** GM only: makes any row current (skip, go back). */
export async function setCurrentEntry(entryId: string): Promise<Combat> {
  return unwrap(await supabase.rpc('set_current_entry', { p_entry_id: entryId }))
}

/** GM only: the current row swaps with the next one. A stale tap is a server no-op. */
export async function delayTurn(combatId: string, expectedEntryId: string): Promise<Combat> {
  return unwrap(await supabase.rpc('delay_turn', { p_combat_id: combatId, p_expected_entry_id: expectedEntryId }))
}

/** GM only. Returns the new entry ids (`Goblin 1..N` for a ×N group). */
export async function addEnemies(combatId: string, input: NewEnemy): Promise<string[]> {
  return unwrap(
    await supabase.rpc('add_enemies', {
      p_combat_id: combatId,
      p_name: input.name,
      p_count: input.count,
      p_max_hp: input.maxHp,
      // Generated Args can't express nullable parameters; the function accepts null for these.
      p_initiative: input.initiative as number,
      p_ac: input.ac as number,
      p_notes: input.notes as string,
      p_hidden: input.hidden,
      // Omitted (not null) when unset, so the function's own defaults apply.
      p_defense_label: input.defenseLabel ?? undefined,
      p_attacks: input.attacks,
      p_xp: input.xp ?? undefined,
    }),
  )
}

/** GM only. Only the keys of EnemyPatch are accepted; the server clamps hit points. */
export async function updateEnemy(entryId: string, patch: EnemyPatch): Promise<Combat> {
  return unwrap(await supabase.rpc('update_enemy', { p_entry_id: entryId, p_patch: patch }))
}

/** GM only, enemies only. Removing the current row passes the turn on first. */
export async function removeEntry(entryId: string): Promise<Combat> {
  return unwrap(await supabase.rpc('remove_entry', { p_entry_id: entryId }))
}

/** A fresh batch id for apply_enemy_hp. Generate one per user action and reuse it on any retry. */
export function newBatchId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16)
    return (ch === 'x' ? r : (r & 3) | 8).toString(16)
  })
}

/**
 * GM only: one amount applied to each listed enemy. Idempotent per `batch` (a repeat with the same id
 * changes nothing), which is also the id `undoEnemyHp` takes. Returns the batch id.
 */
export async function applyEnemyHp(combatId: string, entryIds: string[], mode: HpMode, amount: number, batch: string): Promise<string> {
  return unwrap(await supabase.rpc('apply_enemy_hp', { p_combat_id: combatId, p_entry_ids: entryIds, p_mode: mode, p_amount: amount, p_batch: batch }))
}

/** GM only. Returns how many rows were restored (0 when everything changed again since). */
export async function undoEnemyHp(combatId: string, batch: string): Promise<number> {
  return unwrap(await supabase.rpc('undo_enemy_hp', { p_combat_id: combatId, p_batch: batch }))
}
