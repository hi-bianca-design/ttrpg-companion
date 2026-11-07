import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { check, unwrap } from '@/features/errors'
import type { Attack } from '@/features/combat/combat.api'

type EncounterRow = Database['public']['Tables']['encounters']['Row']
export type EncounterEnemy = Database['public']['Tables']['encounter_enemies']['Row']
/** A GM's prepared fight with its enemies by position. GM only (row-level security). */
export type Encounter = EncounterRow & { enemies: EncounterEnemy[] }

/** The campaign's encounters, oldest first, each with its enemies by position. One round trip. */
export async function listEncounters(campaignId: string): Promise<Encounter[]> {
  const res = await supabase
    .from('encounters')
    .select('*, encounter_enemies(*)')
    .eq('campaign_id', campaignId)
    .order('created_at')
  return unwrap(res).map(({ encounter_enemies, ...encounter }) => ({
    ...encounter,
    enemies: [...encounter_enemies].sort((a, b) => a.position - b.position),
  }))
}

/** One enemy row as `save_encounter` takes it (snake_case, the shape of the table). Its position is its index. */
export type EncounterEnemyInput = {
  name: string
  count: number
  max_hp: number
  defense_label: string | null
  ac: number | null
  xp: number | null
  notes: string | null
  hidden: boolean
  attacks: Attack[]
}

export type EncounterInput = {
  name: string
  storyBefore: string | null
  storyWhy: string | null
  storyAfter: string | null
  enemies: EncounterEnemyInput[]
}

/**
 * Creates the encounter (no `encounterId`) or replaces it and all of its enemies, atomically, in one
 * RPC. GM only; returns the encounter id.
 */
export async function saveEncounter(campaignId: string, input: EncounterInput, encounterId?: string): Promise<string> {
  const res = await supabase.rpc('save_encounter', {
    p_campaign_id: campaignId,
    p_encounter_id: encounterId ?? null,
    p_name: input.name,
    p_story_before: input.storyBefore,
    p_story_why: input.storyWhy,
    p_story_after: input.storyAfter,
    p_enemies: input.enemies,
  })
  return unwrap(res)
}

/** Deletes an encounter (its enemies cascade). Plain delete through the GM-only row-level security policy. */
export async function deleteEncounter(encounterId: string): Promise<void> {
  check(await supabase.from('encounters').delete().eq('id', encounterId))
}
