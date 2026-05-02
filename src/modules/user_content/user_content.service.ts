import { supabase } from '@/lib/supabase'
import { getSpecies, getBackgrounds, getSpellsForClass } from '@/modules/srd/srd.service'
import { DBSpecies, DBBackground, DBSpell } from '@/modules/character/character.types'
import {
  DBUserContent,
  WithCustom,
  SpeciesProperties,
  BackgroundProperties,
  SpellProperties,
} from './user_content.types'
import { Database } from '@/types/database.types'

type UserContentInsert = Database['public']['Tables']['user_content']['Insert']
type UserContentUpdate = Database['public']['Tables']['user_content']['Update']

export async function getUserContent(userId: string): Promise<DBUserContent[]> {
  const { data, error } = await supabase
    .from('user_content')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function createUserContent(
  userId: string,
  data: Pick<DBUserContent, 'content_type' | 'name' | 'description' | 'properties'>
): Promise<DBUserContent> {
  const { data: row, error } = await supabase
    .from('user_content')
    .insert({ ...data, user_id: userId } satisfies UserContentInsert)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as DBUserContent
}

export async function updateUserContent(
  id: string,
  data: Pick<DBUserContent, 'name' | 'description' | 'properties'>
): Promise<DBUserContent> {
  const { data: row, error } = await supabase
    .from('user_content')
    .update(data satisfies UserContentUpdate)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as DBUserContent
}

export async function deleteUserContent(id: string): Promise<void> {
  const { error } = await supabase.from('user_content').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Adapters ---

function customToSpecies(item: DBUserContent): WithCustom<DBSpecies> {
  const props = item.properties as SpeciesProperties
  return {
    id: item.id,
    name: item.name,
    speed: props.speed ?? 30,
    traits: { traits: props.traits ?? [] },
    ability_score_bonuses: {},
    is_custom: true,
  }
}

function customToBackground(item: DBUserContent): WithCustom<DBBackground> {
  const props = item.properties as BackgroundProperties
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    skill_proficiencies: props.skill_proficiencies ?? [],
    // Allow all 6 abilities for the background +2/+1 bonus in the ability scores step.
    ability_score_options: { options: [['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']] },
    feature: props.feature ?? null,
    is_custom: true,
  }
}

function customToSpell(item: DBUserContent): WithCustom<DBSpell> {
  const props = item.properties as SpellProperties
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    level: props.level ?? 0,
    school: props.school ?? '',
    casting_time: props.casting_time ?? 'Action',
    range: props.range ?? '30 ft',
    components: props.components ?? 'V, S',
    duration: props.duration ?? 'Instantaneous',
    classes: props.classes ?? [],
    is_ritual: props.is_ritual ?? false,
    requires_concentration: props.requires_concentration ?? false,
    is_custom: true,
  }
}

// --- Merged getters ---

export async function getSpeciesAll(userId: string): Promise<WithCustom<DBSpecies>[]> {
  const [srdSpecies, customContent] = await Promise.all([getSpecies(), getUserContent(userId)])
  const customSpecies = customContent
    .filter((c) => c.content_type === 'species')
    .map(customToSpecies)
  return [...srdSpecies, ...customSpecies]
}

export async function getBackgroundsAll(userId: string): Promise<WithCustom<DBBackground>[]> {
  const [srdBgs, customContent] = await Promise.all([getBackgrounds(), getUserContent(userId)])
  const customBgs = customContent
    .filter((c) => c.content_type === 'background')
    .map(customToBackground)
  return [...srdBgs, ...customBgs]
}

export async function getSpellsAll(userId: string, className: string): Promise<WithCustom<DBSpell>[]> {
  const lowerName = className.toLowerCase()
  const [srdSpells, customContent] = await Promise.all([getSpellsForClass(className), getUserContent(userId)])
  const customSpells = customContent
    .filter((c) => c.content_type === 'spell')
    .filter((c) => {
      const props = c.properties as SpellProperties
      return (props.classes ?? []).map((cl) => cl.toLowerCase()).includes(lowerName)
    })
    .map(customToSpell)
  return [...srdSpells, ...customSpells]
}
