import { Database } from '@/types/database.types'

export type DBCharacter = Database['public']['Tables']['characters']['Row']
export type DBClass    = Database['public']['Tables']['classes']['Row']
export type DBSubclass = Database['public']['Tables']['subclasses']['Row']
export type DBSpecies  = Database['public']['Tables']['species']['Row']
export type DBBackground = Database['public']['Tables']['backgrounds']['Row']
export type DBSpell    = Database['public']['Tables']['spells']['Row']
export type DBEquipment = Database['public']['Tables']['equipment']['Row']

export type CharacterWithRelations = DBCharacter & {
  class: DBClass | null
  subclass: DBSubclass | null
  species: DBSpecies | null
  background: DBBackground | null
  character_spells: Array<{
    id: string
    spell_id: string | null
    is_prepared: boolean
    slots_expended: Record<string, number>
    spell: DBSpell | null
  }>
  character_equipment: Array<{
    id: string
    equipment_id: string | null
    quantity: number
    is_equipped: boolean
    equipment: DBEquipment | null
  }>
}

// Accumulated in Zustand across wizard steps; submitted on Review step.
export type WizardDraft = {
  // Step 1 — Class
  class_id: string | null
  class_name: string | null   // cached to gate spells step and display summaries
  hit_die: number | null      // cached for HP calculation in createCharacter
  subclass_id: string | null
  // Step 2 — Origin
  species_id: string | null
  background_id: string | null
  custom_species_id: string | null
  custom_background_id: string | null
  // Step 3 — Ability Scores
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  bg_bonus_two: string | null   // ability key that gets +2 from background
  bg_bonus_one: string | null   // ability key that gets +1 from background
  // Step 4 — Personality
  alignment: string
  personality_trait: string
  ideal: string
  bond: string
  flaw: string
  // Step 5 — Spells
  selected_spell_ids: string[]
  selected_custom_spell_ids: string[]
  // Step 6 — Details
  name: string
  appearance: string
  backstory: string
}

export const INITIAL_DRAFT: WizardDraft = {
  class_id: null,
  class_name: null,
  hit_die: null,
  subclass_id: null,
  species_id: null,
  background_id: null,
  custom_species_id: null,
  custom_background_id: null,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  bg_bonus_two: null,
  bg_bonus_one: null,
  alignment: '',
  personality_trait: '',
  ideal: '',
  bond: '',
  flaw: '',
  selected_spell_ids: [],
  selected_custom_spell_ids: [],
  name: '',
  appearance: '',
  backstory: '',
}

export const ABILITY_KEYS = [
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
] as const
export type AbilityKey = typeof ABILITY_KEYS[number]

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
}

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

export const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
]
