export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          name: string
          hit_die: number
          primary_abilities: string[]
          saving_throw_proficiencies: string[]
          description: string | null
          features: Json
        }
        Insert: {
          id?: string
          name: string
          hit_die: number
          primary_abilities: string[]
          saving_throw_proficiencies: string[]
          description?: string | null
          features?: Json
        }
        Update: {
          id?: string
          name?: string
          hit_die?: number
          primary_abilities?: string[]
          saving_throw_proficiencies?: string[]
          description?: string | null
          features?: Json
        }
      }
      subclasses: {
        Row: {
          id: string
          class_id: string
          name: string
          description: string | null
          features: Json
        }
        Insert: {
          id?: string
          class_id: string
          name: string
          description?: string | null
          features?: Json
        }
        Update: {
          id?: string
          class_id?: string
          name?: string
          description?: string | null
          features?: Json
        }
      }
      species: {
        Row: {
          id: string
          name: string
          speed: number
          traits: Json
          ability_score_bonuses: Json
        }
        Insert: {
          id?: string
          name: string
          speed?: number
          traits?: Json
          ability_score_bonuses?: Json
        }
        Update: {
          id?: string
          name?: string
          speed?: number
          traits?: Json
          ability_score_bonuses?: Json
        }
      }
      backgrounds: {
        Row: {
          id: string
          name: string
          skill_proficiencies: string[]
          ability_score_options: Json
          description: string | null
          feature: string | null
        }
        Insert: {
          id?: string
          name: string
          skill_proficiencies: string[]
          ability_score_options?: Json
          description?: string | null
          feature?: string | null
        }
        Update: {
          id?: string
          name?: string
          skill_proficiencies?: string[]
          ability_score_options?: Json
          description?: string | null
          feature?: string | null
        }
      }
      feats: {
        Row: {
          id: string
          name: string
          prerequisites: Json
          benefits: string
          ability_score_bonuses: Json
        }
        Insert: {
          id?: string
          name: string
          prerequisites?: Json
          benefits: string
          ability_score_bonuses?: Json
        }
        Update: {
          id?: string
          name?: string
          prerequisites?: Json
          benefits?: string
          ability_score_bonuses?: Json
        }
      }
      spells: {
        Row: {
          id: string
          name: string
          level: number
          school: string
          casting_time: string
          range: string
          components: string
          duration: string
          description: string
          classes: string[]
          is_ritual: boolean
          requires_concentration: boolean
        }
        Insert: {
          id?: string
          name: string
          level: number
          school: string
          casting_time: string
          range: string
          components: string
          duration: string
          description: string
          classes: string[]
          is_ritual?: boolean
          requires_concentration?: boolean
        }
        Update: {
          id?: string
          name?: string
          level?: number
          school?: string
          casting_time?: string
          range?: string
          components?: string
          duration?: string
          description?: string
          classes?: string[]
          is_ritual?: boolean
          requires_concentration?: boolean
        }
      }
      equipment: {
        Row: {
          id: string
          name: string
          category: string
          cost: string | null
          weight: string | null
          properties: Json
        }
        Insert: {
          id?: string
          name: string
          category: string
          cost?: string | null
          weight?: string | null
          properties?: Json
        }
        Update: {
          id?: string
          name?: string
          category?: string
          cost?: string | null
          weight?: string | null
          properties?: Json
        }
      }
      user_content: {
        Row: {
          id: string
          user_id: string
          content_type: 'subclass' | 'spell' | 'species' | 'background' | 'feat' | 'equipment'
          name: string
          description: string | null
          properties: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_type: 'subclass' | 'spell' | 'species' | 'background' | 'feat' | 'equipment'
          name: string
          description?: string | null
          properties?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_type?: 'subclass' | 'spell' | 'species' | 'background' | 'feat' | 'equipment'
          name?: string
          description?: string | null
          properties?: Json
          created_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          user_id: string
          name: string
          level: number
          class_id: string | null
          subclass_id: string | null
          species_id: string | null
          background_id: string | null
          alignment: string | null
          strength: number
          dexterity: number
          constitution: number
          intelligence: number
          wisdom: number
          charisma: number
          hp_max: number
          hp_current: number
          temp_hp: number
          armor_class: number
          speed: number
          proficiency_bonus: number
          death_save_successes: number
          death_save_failures: number
          conditions: string[]
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          level?: number
          class_id?: string | null
          subclass_id?: string | null
          species_id?: string | null
          background_id?: string | null
          alignment?: string | null
          strength: number
          dexterity: number
          constitution: number
          intelligence: number
          wisdom: number
          charisma: number
          hp_max: number
          hp_current: number
          temp_hp?: number
          armor_class: number
          speed?: number
          proficiency_bonus?: number
          death_save_successes?: number
          death_save_failures?: number
          conditions?: string[]
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          level?: number
          class_id?: string | null
          subclass_id?: string | null
          species_id?: string | null
          background_id?: string | null
          alignment?: string | null
          strength?: number
          dexterity?: number
          constitution?: number
          intelligence?: number
          wisdom?: number
          charisma?: number
          hp_max?: number
          hp_current?: number
          temp_hp?: number
          armor_class?: number
          speed?: number
          proficiency_bonus?: number
          death_save_successes?: number
          death_save_failures?: number
          conditions?: string[]
          notes?: string
          created_at?: string
        }
      }
      character_spells: {
        Row: {
          id: string
          character_id: string
          spell_id: string | null
          custom_content_id: string | null
          is_prepared: boolean
          slots_expended: Json
        }
        Insert: {
          id?: string
          character_id: string
          spell_id?: string | null
          custom_content_id?: string | null
          is_prepared?: boolean
          slots_expended?: Json
        }
        Update: {
          id?: string
          character_id?: string
          spell_id?: string | null
          custom_content_id?: string | null
          is_prepared?: boolean
          slots_expended?: Json
        }
      }
      character_equipment: {
        Row: {
          id: string
          character_id: string
          equipment_id: string | null
          custom_content_id: string | null
          quantity: number
          is_equipped: boolean
        }
        Insert: {
          id?: string
          character_id: string
          equipment_id?: string | null
          custom_content_id?: string | null
          quantity?: number
          is_equipped?: boolean
        }
        Update: {
          id?: string
          character_id?: string
          equipment_id?: string | null
          custom_content_id?: string | null
          quantity?: number
          is_equipped?: boolean
        }
      }
      campaigns: {
        Row: {
          id: string
          dm_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          dm_id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          dm_id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      campaign_members: {
        Row: {
          campaign_id: string
          user_id: string
          character_id: string | null
          status: 'invited' | 'active'
        }
        Insert: {
          campaign_id: string
          user_id: string
          character_id?: string | null
          status: 'invited' | 'active'
        }
        Update: {
          campaign_id?: string
          user_id?: string
          character_id?: string | null
          status?: 'invited' | 'active'
        }
      }
      sessions: {
        Row: {
          id: string
          campaign_id: string
          status: 'lobby' | 'active' | 'ended'
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          status?: 'lobby' | 'active' | 'ended'
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          status?: 'lobby' | 'active' | 'ended'
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
      }
      session_characters: {
        Row: {
          session_id: string
          character_id: string
          hp_current: number
          temp_hp: number
          conditions: string[]
          spell_slots_used: Json
          death_save_successes: number
          death_save_failures: number
          initiative: number | null
          is_active_turn: boolean
        }
        Insert: {
          session_id: string
          character_id: string
          hp_current: number
          temp_hp?: number
          conditions?: string[]
          spell_slots_used?: Json
          death_save_successes?: number
          death_save_failures?: number
          initiative?: number | null
          is_active_turn?: boolean
        }
        Update: {
          session_id?: string
          character_id?: string
          hp_current?: number
          temp_hp?: number
          conditions?: string[]
          spell_slots_used?: Json
          death_save_successes?: number
          death_save_failures?: number
          initiative?: number | null
          is_active_turn?: boolean
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
