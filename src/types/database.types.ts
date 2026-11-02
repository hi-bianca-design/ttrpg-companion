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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      campaign_members: {
        Row: {
          campaign_id: string
          character_id: string | null
          created_at: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          character_id?: string | null
          created_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          character_id?: string | null
          created_at?: string
          role?: string
          status?: string
          updated_at?: string
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          gm_id: string
          id: string
          invite_code: string
          name: string
          system_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gm_id: string
          id?: string
          invite_code?: string
          name: string
          system_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gm_id?: string
          id?: string
          invite_code?: string
          name?: string
          system_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_gm_id_fkey"
            columns: ["gm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "game_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      character_items: {
        Row: {
          attuned: boolean
          character_id: string
          content_id: string
          created_at: string
          equipped: boolean
          id: string
          notes: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          attuned?: boolean
          character_id: string
          content_id: string
          created_at?: string
          equipped?: boolean
          id?: string
          notes?: string | null
          quantity?: number
          updated_at?: string
        }
        Update: {
          attuned?: boolean
          character_id?: string
          content_id?: string
          created_at?: string
          equipped?: boolean
          id?: string
          notes?: string | null
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_items_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      character_picks: {
        Row: {
          acquired_at_level: number
          character_id: string
          content_id: string
          created_at: string
          kind: string
          state: Json
          updated_at: string
        }
        Insert: {
          acquired_at_level?: number
          character_id: string
          content_id: string
          created_at?: string
          kind: string
          state?: Json
          updated_at?: string
        }
        Update: {
          acquired_at_level?: number
          character_id?: string
          content_id?: string
          created_at?: string
          kind?: string
          state?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_picks_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_picks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          conditions: string[]
          created_at: string
          details: Json
          id: string
          level: number
          name: string
          notes: string | null
          owner_id: string
          portrait_url: string | null
          resources: Json
          stats: Json
          system_id: string
          updated_at: string
        }
        Insert: {
          conditions?: string[]
          created_at?: string
          details?: Json
          id?: string
          level?: number
          name: string
          notes?: string | null
          owner_id: string
          portrait_url?: string | null
          resources?: Json
          stats?: Json
          system_id: string
          updated_at?: string
        }
        Update: {
          conditions?: string[]
          created_at?: string
          details?: Json
          id?: string
          level?: number
          name?: string
          notes?: string | null
          owner_id?: string
          portrait_url?: string | null
          resources?: Json
          stats?: Json
          system_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "game_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          campaign_id: string | null
          created_at: string
          data: Json
          description: string | null
          id: string
          kind: string
          name: string
          owner_id: string | null
          pack_id: string | null
          parent_id: string | null
          slug: string
          summary: string | null
          system_id: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          data?: Json
          description?: string | null
          id?: string
          kind: string
          name: string
          owner_id?: string | null
          pack_id?: string | null
          parent_id?: string | null
          slug: string
          summary?: string | null
          system_id: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          data?: Json
          description?: string | null
          id?: string
          kind?: string
          name?: string
          owner_id?: string | null
          pack_id?: string | null
          parent_id?: string | null
          slug?: string
          summary?: string | null
          system_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "game_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      game_systems: {
        Row: {
          attribution: string
          id: string
          license: string
          name: string
          version: string | null
        }
        Insert: {
          attribution: string
          id: string
          license: string
          name: string
          version?: string | null
        }
        Update: {
          attribution?: string
          id?: string
          license?: string
          name?: string
          version?: string | null
        }
        Relationships: []
      }
      pack_entitlements: {
        Row: {
          expires_at: string | null
          granted_at: string
          pack_id: string
          source: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          pack_id: string
          source: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          pack_id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_entitlements_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packs: {
        Row: {
          artist_credit: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          kind: string
          name: string
          published: boolean
          slug: string
          store_product_id: string | null
          system_id: string | null
        }
        Insert: {
          artist_credit?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          name: string
          published?: boolean
          slug: string
          store_product_id?: string | null
          system_id?: string | null
        }
        Update: {
          artist_credit?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          name?: string
          published?: boolean
          slug?: string
          store_product_id?: string | null
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packs_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "game_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          campaign_id: string
          combat_started_by: string | null
          created_at: string
          current_turn_user_id: string | null
          ended_at: string | null
          id: string
          in_combat: boolean
          opened_by: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          combat_started_by?: string | null
          created_at?: string
          current_turn_user_id?: string | null
          ended_at?: string | null
          id?: string
          in_combat?: boolean
          opened_by?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          combat_started_by?: string | null
          created_at?: string
          current_turn_user_id?: string | null
          ended_at?: string | null
          id?: string
          in_combat?: boolean
          opened_by?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_combat_started_by_fkey"
            columns: ["combat_started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_current_turn_user_id_fkey"
            columns: ["current_turn_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      campaign_sheet_content_ids: { Args: never; Returns: string[] }
      campaign_visible_character_ids: { Args: never; Returns: string[] }
      can_reference_content: {
        Args: { p_content_id: string }
        Returns: boolean
      }
      can_view_character: { Args: { p_character_id: string }; Returns: boolean }
      create_campaign: {
        Args: { p_description?: string; p_name: string; p_system_id: string }
        Returns: {
          created_at: string
          description: string | null
          gm_id: string
          id: string
          invite_code: string
          name: string
          system_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      end_session: {
        Args: { p_session_id: string }
        Returns: {
          campaign_id: string
          combat_started_by: string | null
          created_at: string
          current_turn_user_id: string | null
          ended_at: string | null
          id: string
          in_combat: boolean
          opened_by: string | null
          started_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      end_turn: {
        Args: { p_session_id: string }
        Returns: {
          campaign_id: string
          combat_started_by: string | null
          created_at: string
          current_turn_user_id: string | null
          ended_at: string | null
          id: string
          in_combat: boolean
          opened_by: string | null
          started_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gen_invite_code: { Args: never; Returns: string }
      has_sheet_content: {
        Args: { p_character_id: string; p_content_id: string }
        Returns: boolean
      }
      is_campaign_gm: { Args: { p_campaign_id: string }; Returns: boolean }
      is_campaign_member: { Args: { p_campaign_id: string }; Returns: boolean }
      is_active_campaign_member: {
        Args: { p_campaign_id: string }
        Returns: boolean
      }
      join_campaign: {
        Args: { p_character_id: string; p_code: string }
        Returns: string
      }
      lock_active_session: {
        Args: { p_session_id: string }
        Returns: {
          campaign_id: string
          combat_started_by: string | null
          created_at: string
          current_turn_user_id: string | null
          ended_at: string | null
          id: string
          in_combat: boolean
          opened_by: string | null
          started_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      open_session: {
        Args: { p_campaign_id: string }
        Returns: {
          campaign_id: string
          combat_started_by: string | null
          created_at: string
          current_turn_user_id: string | null
          ended_at: string | null
          id: string
          in_combat: boolean
          opened_by: string | null
          started_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      own_sheet_content_ids: { Args: never; Returns: string[] }
      owns_character: { Args: { p_character_id: string }; Returns: boolean }
      owns_pack: { Args: { p_pack_id: string }; Returns: boolean }
      set_combat: {
        Args: { p_in_combat: boolean; p_session_id: string }
        Returns: {
          campaign_id: string
          combat_started_by: string | null
          created_at: string
          current_turn_user_id: string | null
          ended_at: string | null
          id: string
          in_combat: boolean
          opened_by: string | null
          started_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_turn: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: {
          campaign_id: string
          combat_started_by: string | null
          created_at: string
          current_turn_user_id: string | null
          ended_at: string | null
          id: string
          in_combat: boolean
          opened_by: string | null
          started_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      username_available: { Args: { p_username: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
