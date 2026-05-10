import { Database, Json } from '@/types/database.types'
// Safe circular import: character.types imports DBMagicItem/DBCampaignItem from here;
// we import DBEquipment/CustomContentRef from there. Both export only `type` aliases —
// no runtime values cross the boundary, so Metro/Node never see a circular dependency.
import { DBEquipment, CustomContentRef } from '@/modules/character/character.types'

// Raw DB row types from generated types
export type DBMagicItem    = Database['public']['Tables']['magic_items']['Row']
export type DBCampaignItem = Database['public']['Tables']['campaign_items']['Row']
export type DBInventoryRow = Database['public']['Tables']['character_inventory']['Row']

// A fully-joined inventory row (what getInventory returns)
export type InventoryItem = DBInventoryRow & {
  equipment:     DBEquipment    | null
  magic_item:    DBMagicItem    | null
  campaign_item: DBCampaignItem | null
  custom_item:   CustomContentRef | null
}

// Input for adding an item — exactly one of the four ID fields must be provided
export type AddInventoryItemInput = {
  equipment_id?:      string
  magic_item_id?:     string
  campaign_item_id?:  string
  custom_content_id?: string
  quantity?:          number
  is_equipped?:       boolean
  is_attuned?:        boolean
  notes?:             string
}

// Fields that can be updated after an item is in the inventory
export type UpdateInventoryItemInput = {
  quantity?:    number
  is_equipped?: boolean
  is_attuned?:  boolean
  notes?:       string
}

// Input for creating a DM campaign item
export type CreateCampaignItemInput = {
  name:                 string
  item_type:            string
  rarity?:              DBCampaignItem['rarity']
  requires_attunement?: boolean
  attunement_condition?: string
  description?:         string
  properties?:          Json
}

// Fields that can be updated on a DM campaign item
export type UpdateCampaignItemInput = {
  name?:                string
  item_type?:           string
  rarity?:              DBCampaignItem['rarity']
  requires_attunement?: boolean
  attunement_condition?: string
  description?:         string
  properties?:          Json
}
