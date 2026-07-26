export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AppRole = 'customer' | 'super_admin'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone: string | null
          membership_number: string
          name: string | null
          avatar_url: string | null
          preferred_branch_id: string | null
          marketing_consent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          membership_number?: string
          name?: string | null
          avatar_url?: string | null
          preferred_branch_id?: string | null
          marketing_consent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string | null
          avatar_url?: string | null
          preferred_branch_id?: string | null
          marketing_consent?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          user_id: string
          role: AppRole
          created_at: string
        }
        Insert: {
          user_id: string
          role?: AppRole
          created_at?: string
        }
        Update: {
          role?: AppRole
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: number
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      has_role: {
        Args: { requested_role: AppRole }
        Returns: boolean
      }
      update_my_profile: {
        Args: {
          p_name: string | null
          p_avatar_url: string | null
          p_marketing_consent: boolean
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
    }
    Enums: {
      app_role: AppRole
    }
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
