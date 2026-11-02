import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { unwrap } from '@/features/errors'

export type PackRow = Database['public']['Tables']['packs']['Row']
export type EntitlementRow = Database['public']['Tables']['pack_entitlements']['Row']

/** The pack catalog. RLS returns published packs only. */
export async function listPacks(): Promise<PackRow[]> {
  return unwrap(await supabase.from('packs').select('*').order('name')) ?? []
}

/** The caller's own entitlements (RLS limits the table to them), including expired ones. */
export async function listMyEntitlements(): Promise<EntitlementRow[]> {
  return unwrap(await supabase.from('pack_entitlements').select('*')) ?? []
}
