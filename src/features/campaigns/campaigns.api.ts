import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import type { SystemId } from '@/systems/types'
import { unwrap } from '@/features/errors'

type CampaignRow = Database['public']['Tables']['campaigns']['Row']
type MemberRow = Database['public']['Tables']['campaign_members']['Row']

export type CampaignSummary = CampaignRow & { member_count: number }
export type CampaignMember = MemberRow & { username: string | null; character_name: string | null }
export type CampaignFull = CampaignRow & { members: CampaignMember[] }

export async function listMyCampaigns(): Promise<CampaignSummary[]> {
  const rows = unwrap(
    await supabase.from('campaigns').select('*, campaign_members(count)').order('created_at', { ascending: false }),
  ) ?? []
  return rows.map(({ campaign_members, ...c }) => ({ ...c, member_count: campaign_members[0]?.count ?? 0 }))
}

export async function getCampaign(id: string): Promise<CampaignFull> {
  const { campaign_members, ...c } = unwrap(
    await supabase
      .from('campaigns')
      .select('*, campaign_members(*, profiles(username), characters(name))')
      .eq('id', id)
      .single(),
  )
  return {
    ...c,
    members: campaign_members.map(({ profiles, characters, ...m }) => ({
      ...m,
      username: profiles?.username ?? null,
      character_name: characters?.name ?? null,
    })),
  }
}

export async function createCampaign(input: { name: string; systemId: SystemId; description?: string }): Promise<string> {
  const row = unwrap(
    await supabase.rpc('create_campaign', {
      p_name: input.name, p_system_id: input.systemId, p_description: input.description,
    }),
  )
  return row.id
}

export async function joinCampaign(code: string, characterId: string): Promise<string> {
  return unwrap(await supabase.rpc('join_campaign', { p_code: code, p_character_id: characterId }))
}
