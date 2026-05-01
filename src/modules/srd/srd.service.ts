import { supabase } from '@/lib/supabase'
import { DBClass, DBSubclass, DBSpecies, DBBackground, DBSpell } from '@/modules/character/character.types'

export async function getClasses(): Promise<DBClass[]> {
  const { data, error } = await supabase.from('classes').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getSubclassesForClass(classId: string): Promise<DBSubclass[]> {
  const { data, error } = await supabase
    .from('subclasses').select('*').eq('class_id', classId).order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getSpecies(): Promise<DBSpecies[]> {
  const { data, error } = await supabase.from('species').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getBackgrounds(): Promise<DBBackground[]> {
  const { data, error } = await supabase.from('backgrounds').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getSpellsForClass(className: string): Promise<DBSpell[]> {
  const { data, error } = await supabase
    .from('spells')
    .select('*')
    .contains('classes', [className.toLowerCase()])
    .order('level')
    .order('name')
  if (error) throw new Error(error.message)
  return data
}
