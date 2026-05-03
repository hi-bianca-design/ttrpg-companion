export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      backgrounds: {
        Row: {
          ability_score_options: Json | null
          description: string | null
          feature: string | null
          id: string
          name: string
          skill_proficiencies: string[]
        }
        Insert: {
          ability_score_options?: Json | null
          description?: string | null
          feature?: string | null
          id?: string
          name: string
          skill_proficiencies: string[]
        }
        Update: {
          ability_score_options?: Json | null
          description?: string | null
          feature?: string | null
          id?: string
          name?: string
          skill_proficiencies?: string[]
        }
        Relationships: []
      }
      campaign_members: {
        Row: {
          campaign_id: string
          character_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          character_id?: string | null
          status: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          character_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string | null
          description: string | null
          dm_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dm_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dm_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      character_equipment: {
        Row: {
          character_id: string
          custom_content_id: string | null
          equipment_id: string | null
          id: string
          is_equipped: boolean
          quantity: number
        }
        Insert: {
          character_id: string
          custom_content_id?: string | null
          equipment_id?: string | null
          id?: string
          is_equipped?: boolean
          quantity?: number
        }
        Update: {
          character_id?: string
          custom_content_id?: string | null
          equipment_id?: string | null
          id?: string
          is_equipped?: boolean
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_equipment_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_equipment_custom_content_id_fkey"
            columns: ["custom_content_id"]
            isOneToOne: false
            referencedRelation: "user_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      character_spells: {
        Row: {
          character_id: string
          custom_content_id: string | null
          id: string
          is_prepared: boolean | null
          slots_expended: Json | null
          spell_id: string | null
        }
        Insert: {
          character_id: string
          custom_content_id?: string | null
          id?: string
          is_prepared?: boolean | null
          slots_expended?: Json | null
          spell_id?: string | null
        }
        Update: {
          character_id?: string
          custom_content_id?: string | null
          id?: string
          is_prepared?: boolean | null
          slots_expended?: Json | null
          spell_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_spells_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_spells_custom_content_id_fkey"
            columns: ["custom_content_id"]
            isOneToOne: false
            referencedRelation: "user_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_spells_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          alignment: string | null
          armor_class: number
          background_id: string | null
          charisma: number
          class_id: string | null
          conditions: string[] | null
          constitution: number
          created_at: string | null
          custom_background_id: string | null
          custom_species_id: string | null
          death_save_failures: number
          death_save_successes: number
          dexterity: number
          hp_current: number
          hp_max: number
          id: string
          intelligence: number
          level: number
          name: string
          notes: string | null
          proficiency_bonus: number
          species_id: string | null
          speed: number
          strength: number
          subclass_id: string | null
          temp_hp: number
          user_id: string
          wisdom: number
        }
        Insert: {
          alignment?: string | null
          armor_class: number
          background_id?: string | null
          charisma: number
          class_id?: string | null
          conditions?: string[] | null
          constitution: number
          created_at?: string | null
          custom_background_id?: string | null
          custom_species_id?: string | null
          death_save_failures?: number
          death_save_successes?: number
          dexterity: number
          hp_current: number
          hp_max: number
          id?: string
          intelligence: number
          level?: number
          name: string
          notes?: string | null
          proficiency_bonus?: number
          species_id?: string | null
          speed?: number
          strength: number
          subclass_id?: string | null
          temp_hp?: number
          user_id: string
          wisdom: number
        }
        Update: {
          alignment?: string | null
          armor_class?: number
          background_id?: string | null
          charisma?: number
          class_id?: string | null
          conditions?: string[] | null
          constitution?: number
          created_at?: string | null
          custom_background_id?: string | null
          custom_species_id?: string | null
          death_save_failures?: number
          death_save_successes?: number
          dexterity?: number
          hp_current?: number
          hp_max?: number
          id?: string
          intelligence?: number
          level?: number
          name?: string
          notes?: string | null
          proficiency_bonus?: number
          species_id?: string | null
          speed?: number
          strength?: number
          subclass_id?: string | null
          temp_hp?: number
          user_id?: string
          wisdom?: number
        }
        Relationships: [
          {
            foreignKeyName: "characters_background_id_fkey"
            columns: ["background_id"]
            isOneToOne: false
            referencedRelation: "backgrounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_custom_background_id_fkey"
            columns: ["custom_background_id"]
            isOneToOne: false
            referencedRelation: "user_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_custom_species_id_fkey"
            columns: ["custom_species_id"]
            isOneToOne: false
            referencedRelation: "user_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_subclass_id_fkey"
            columns: ["subclass_id"]
            isOneToOne: false
            referencedRelation: "subclasses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          description: string | null
          features: Json | null
          hit_die: number
          id: string
          name: string
          primary_abilities: string[]
          saving_throw_proficiencies: string[]
        }
        Insert: {
          description?: string | null
          features?: Json | null
          hit_die: number
          id?: string
          name: string
          primary_abilities: string[]
          saving_throw_proficiencies: string[]
        }
        Update: {
          description?: string | null
          features?: Json | null
          hit_die?: number
          id?: string
          name?: string
          primary_abilities?: string[]
          saving_throw_proficiencies?: string[]
        }
        Relationships: []
      }
      equipment: {
        Row: {
          category: string
          cost: string | null
          id: string
          name: string
          properties: Json | null
          weight: number | null
        }
        Insert: {
          category: string
          cost?: string | null
          id?: string
          name: string
          properties?: Json | null
          weight?: number | null
        }
        Update: {
          category?: string
          cost?: string | null
          id?: string
          name?: string
          properties?: Json | null
          weight?: number | null
        }
        Relationships: []
      }
      feats: {
        Row: {
          ability_score_bonuses: Json | null
          benefits: string
          id: string
          name: string
          prerequisites: Json | null
        }
        Insert: {
          ability_score_bonuses?: Json | null
          benefits: string
          id?: string
          name: string
          prerequisites?: Json | null
        }
        Update: {
          ability_score_bonuses?: Json | null
          benefits?: string
          id?: string
          name?: string
          prerequisites?: Json | null
        }
        Relationships: []
      }
      session_characters: {
        Row: {
          character_id: string
          conditions: string[] | null
          death_save_failures: number
          death_save_successes: number
          hp_current: number
          initiative: number | null
          is_active_turn: boolean | null
          session_id: string
          spell_slots_used: Json | null
          temp_hp: number
        }
        Insert: {
          character_id: string
          conditions?: string[] | null
          death_save_failures?: number
          death_save_successes?: number
          hp_current: number
          initiative?: number | null
          is_active_turn?: boolean | null
          session_id: string
          spell_slots_used?: Json | null
          temp_hp?: number
        }
        Update: {
          character_id?: string
          conditions?: string[] | null
          death_save_failures?: number
          death_save_successes?: number
          hp_current?: number
          initiative?: number | null
          is_active_turn?: boolean | null
          session_id?: string
          spell_slots_used?: Json | null
          temp_hp?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_characters_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          campaign_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          started_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      species: {
        Row: {
          ability_score_bonuses: Json | null
          id: string
          name: string
          speed: number
          traits: Json | null
        }
        Insert: {
          ability_score_bonuses?: Json | null
          id?: string
          name: string
          speed?: number
          traits?: Json | null
        }
        Update: {
          ability_score_bonuses?: Json | null
          id?: string
          name?: string
          speed?: number
          traits?: Json | null
        }
        Relationships: []
      }
      spells: {
        Row: {
          casting_time: string
          classes: string[]
          components: string
          description: string
          duration: string
          id: string
          is_ritual: boolean | null
          level: number
          name: string
          range: string
          requires_concentration: boolean | null
          school: string
        }
        Insert: {
          casting_time: string
          classes: string[]
          components: string
          description: string
          duration: string
          id?: string
          is_ritual?: boolean | null
          level: number
          name: string
          range: string
          requires_concentration?: boolean | null
          school: string
        }
        Update: {
          casting_time?: string
          classes?: string[]
          components?: string
          description?: string
          duration?: string
          id?: string
          is_ritual?: boolean | null
          level?: number
          name?: string
          range?: string
          requires_concentration?: boolean | null
          school?: string
        }
        Relationships: []
      }
      subclasses: {
        Row: {
          class_id: string
          description: string | null
          features: Json | null
          id: string
          name: string
        }
        Insert: {
          class_id: string
          description?: string | null
          features?: Json | null
          id?: string
          name: string
        }
        Update: {
          class_id?: string
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subclasses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_content: {
        Row: {
          content_type: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          properties: Json | null
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          properties?: Json | null
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          properties?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
