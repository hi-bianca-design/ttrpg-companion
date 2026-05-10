import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { DBCampaignItem, CreateCampaignItemInput } from '@/modules/inventory/inventory.types'

type CampaignItemInsert = Database['public']['Tables']['campaign_items']['Insert']
type CampaignItemUpdate = Database['public']['Tables']['campaign_items']['Update']

export async function getCampaignItems(campaignId: string): Promise<DBCampaignItem[]> {
  const { data, error } = await supabase
    .from('campaign_items')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function createCampaignItem(
  campaignId: string,
  createdBy: string,
  input: CreateCampaignItemInput
): Promise<DBCampaignItem> {
  const { data, error } = await supabase
    .from('campaign_items')
    .insert({
      campaign_id:          campaignId,
      created_by:           createdBy,
      name:                 input.name,
      item_type:            input.item_type,
      rarity:               input.rarity ?? null,
      requires_attunement:  input.requires_attunement ?? false,
      attunement_condition: input.attunement_condition ?? null,
      description:          input.description ?? null,
      properties:           input.properties ?? {},
    } satisfies CampaignItemInsert)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateCampaignItem(
  id: string,
  updates: Partial<CreateCampaignItemInput>
): Promise<DBCampaignItem> {
  const { data, error } = await supabase
    .from('campaign_items')
    .update(updates as CampaignItemUpdate)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteCampaignItem(id: string): Promise<void> {
  const { error } = await supabase.from('campaign_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
