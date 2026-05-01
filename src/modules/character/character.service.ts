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
  character_spells(id, spell_id, is_prepared, slots_expended, spell:spells(*)),
  character_equipment(id, equipment_id, quantity, is_equipped, equipment:equipment(*))
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
      species_id: draft.species_id,
      background_id: draft.background_id,
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

  if (draft.selected_spell_ids.length > 0) {
    await supabase.from('character_spells').insert(
      draft.selected_spell_ids.map((spell_id) => ({
        character_id: data.id,
        spell_id,
        is_prepared: true,
      }))
    )
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
