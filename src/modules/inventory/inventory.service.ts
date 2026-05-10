import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import {
  InventoryItem,
  AddInventoryItemInput,
  UpdateInventoryItemInput,
} from './inventory.types'

type InventoryInsert = Database['public']['Tables']['character_inventory']['Insert']
type InventoryUpdate = Database['public']['Tables']['character_inventory']['Update']

const INVENTORY_SELECT = `
  *,
  equipment:equipment(*),
  magic_item:magic_items(*),
  campaign_item:campaign_items(*),
  custom_item:user_content!character_inventory_custom_content_id_fkey(id, name, properties)
`

export async function getInventory(characterId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('character_inventory')
    .select(INVENTORY_SELECT)
    .eq('character_id', characterId)
    .order('acquired_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data as InventoryItem[]
}

export async function addInventoryItem(
  characterId: string,
  input: AddInventoryItemInput
): Promise<InventoryItem> {
  const sourcesProvided = [
    input.equipment_id, input.magic_item_id,
    input.campaign_item_id, input.custom_content_id,
  ].filter(Boolean).length
  if (sourcesProvided !== 1) throw new Error('Exactly one item source must be provided')

  const { data, error } = await supabase
    .from('character_inventory')
    .insert({
      character_id:      characterId,
      equipment_id:      input.equipment_id      ?? null,
      magic_item_id:     input.magic_item_id     ?? null,
      campaign_item_id:  input.campaign_item_id  ?? null,
      custom_content_id: input.custom_content_id ?? null,
      quantity:          input.quantity    ?? 1,
      is_equipped:       input.is_equipped ?? false,
      is_attuned:        input.is_attuned  ?? false,
      notes:             input.notes       ?? '',
    } satisfies InventoryInsert)
    .select(INVENTORY_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return data as InventoryItem
}

export async function updateInventoryItem(
  id: string,
  updates: UpdateInventoryItemInput
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('character_inventory')
    .update(updates satisfies InventoryUpdate)
    .eq('id', id)
    .select(INVENTORY_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return data as InventoryItem
}

export async function removeInventoryItem(id: string): Promise<void> {
  const { error } = await supabase.from('character_inventory').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
