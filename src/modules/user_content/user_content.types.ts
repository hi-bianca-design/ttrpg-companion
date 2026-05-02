import { Database } from '@/types/database.types'

export type DBUserContent = Database['public']['Tables']['user_content']['Row']
export type ContentType = DBUserContent['content_type']

export interface SubclassProperties {
  class_id: string
  features: string
}

export interface SpeciesProperties {
  speed: number
  traits: string[]
}

export interface BackgroundProperties {
  skill_proficiencies: string[]
  feature: string | null
}

export interface SpellProperties {
  level: number
  school: string
  casting_time: string
  range: string
  components: string
  duration: string
  classes: string[]
  is_ritual: boolean
  requires_concentration: boolean
}

export interface FeatProperties {
  prerequisites: string
  benefits: string
}

export interface EquipmentProperties {
  category: string
  cost: string | null
  weight: string | null
}

// Tags a SRD type with an optional is_custom marker for UI badge display.
export type WithCustom<T> = T & { is_custom?: boolean }

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  subclass:   'Subclass',
  spell:      'Spell',
  species:    'Species',
  background: 'Background',
  feat:       'Feat',
  equipment:  'Equipment',
}
