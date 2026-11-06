import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { unwrap } from '@/features/errors'

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
