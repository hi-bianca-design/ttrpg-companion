import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { WizardDraft } from './character.types'
import { getAbilityModifier, getMaxHP } from './character.utils'

type CharacterUpdate = Database['public']['Tables']['characters']['Update']

const SHEET_SELECT = `
  *,
  class:classes(*),
  subclass:subclasses(*),
  species:species(*),
  background:backgrounds(*),
  custom_species:user_content!characters_custom_species_id_fkey(id, name, properties),
  custom_background:user_content!characters_custom_background_id_fkey(id, name, properties),
  character_spells(id, spell_id, custom_content_id, is_prepared, slots_expended, spell:spells(*)),
  character_equipment(id, equipment_id, custom_content_id, quantity, is_equipped, equipment:equipment(*), custom_equipment:user_content!character_equipment_custom_content_id_fkey(id, name, properties)),
  character_inventory(id, equipment_id, magic_item_id, campaign_item_id, custom_content_id, quantity, is_equipped, is_attuned, notes, acquired_at, equipment:equipment(*), magic_item:magic_items(*), campaign_item:campaign_items(*), custom_item:user_content!character_inventory_custom_content_id_fkey(id, name, properties))
`

export async function getCharacters(userId: string) {
  const { data, error } = await supabase
    .from('characters')
    .select('*, class:classes(name, hit_die), species:species(name), background:backgrounds(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getCharacter(id: string) {
  const { data, error } = await supabase
    .from('characters')
    .select(SHEET_SELECT)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createCharacter(userId: string, draft: WizardDraft) {
  const conMod = getAbilityModifier(draft.constitution)
  const dexMod = getAbilityModifier(draft.dexterity)
  const hpMax  = getMaxHP(1, draft.hit_die ?? 8, conMod)

  const { data, error } = await supabase
    .from('characters')
    .insert({
      user_id: userId,
      name: draft.name,
      level: 1,
      class_id: draft.class_id,
      subclass_id: draft.subclass_id,
      species_id: draft.custom_species_id ? null : draft.species_id,
      background_id: draft.custom_background_id ? null : draft.background_id,
      custom_species_id: draft.custom_species_id ?? null,
      custom_background_id: draft.custom_background_id ?? null,
      alignment: draft.alignment || null,
      strength: draft.strength,
      dexterity: draft.dexterity,
      constitution: draft.constitution,
      intelligence: draft.intelligence,
      wisdom: draft.wisdom,
      charisma: draft.charisma,
      hp_max: hpMax,
      hp_current: hpMax,
      armor_class: 10 + dexMod,
      speed: 30,
      proficiency_bonus: 2,
      notes: draft.backstory,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const spellRows = [
    ...draft.selected_spell_ids.map((spell_id) => ({
      character_id: data.id,
      spell_id,
      custom_content_id: null as string | null,
      is_prepared: true,
    })),
    ...(draft.selected_custom_spell_ids ?? []).map((custom_content_id) => ({
      character_id: data.id,
      spell_id: null as string | null,
      custom_content_id,
      is_prepared: true,
    })),
  ]
  if (spellRows.length > 0) {
    const { error: spellError } = await supabase.from('character_spells').insert(spellRows)
    if (spellError) throw new Error(spellError.message)
  }

  return data
}

export async function updateCharacter(id: string, updates: CharacterUpdate) {
  const { data, error } = await supabase
    .from('characters')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteCharacter(id: string) {
  const { error } = await supabase.from('characters').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
