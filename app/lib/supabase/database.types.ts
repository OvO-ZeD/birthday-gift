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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      gift_media: {
        Row: {
          caption: string
          created_at: string
          gift_id: string
          id: string
          kind: string
          mime_type: string
          original_filename: string
          position: number
          size_bytes: number
          storage_path: string
          title: string
        }
        Insert: {
          caption?: string
          created_at?: string
          gift_id: string
          id?: string
          kind: string
          mime_type: string
          original_filename: string
          position?: number
          size_bytes?: number
          storage_path: string
          title?: string
        }
        Update: {
          caption?: string
          created_at?: string
          gift_id?: string
          id?: string
          kind?: string
          mime_type?: string
          original_filename?: string
          position?: number
          size_bytes?: number
          storage_path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_media_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_invitations: {
        Row: {
          created_at: string
          email_error: string | null
          email_provider: string | null
          email_provider_id: string | null
          email_sent_at: string | null
          email_status: string
          expires_at: string | null
          gift_id: string
          id: string
          last_used_at: string | null
          recipient_email: string
          recipient_name: string | null
          revoked_at: string | null
          token_hash: string
          token_prefix: string
          use_count: number
        }
        Insert: {
          created_at?: string
          email_error?: string | null
          email_provider?: string | null
          email_provider_id?: string | null
          email_sent_at?: string | null
          email_status?: string
          expires_at?: string | null
          gift_id: string
          id?: string
          last_used_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          revoked_at?: string | null
          token_hash: string
          token_prefix: string
          use_count?: number
        }
        Update: {
          created_at?: string
          email_error?: string | null
          email_provider?: string | null
          email_provider_id?: string | null
          email_sent_at?: string | null
          email_status?: string
          expires_at?: string | null
          gift_id?: string
          id?: string
          last_used_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          revoked_at?: string | null
          token_hash?: string
          token_prefix?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_invitations_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          access_version: number
          countdown_enabled: boolean
          created_at: string
          experience_enabled: boolean
          id: string
          letter: string
          owner_id: string
          password_enabled: boolean
          password_hash: string | null
          postcard_note: string | null
          postcard_subject: string | null
          published: boolean
          recipient: string
          reveal_at: string | null
          slug: string
          theme: string
          title: string
          updated_at: string
          youtube_video_id: string | null
        }
        Insert: {
          access_version?: number
          countdown_enabled?: boolean
          created_at?: string
          experience_enabled?: boolean
          id?: string
          letter?: string
          owner_id: string
          password_enabled?: boolean
          password_hash?: string | null
          postcard_note?: string | null
          postcard_subject?: string | null
          published?: boolean
          recipient?: string
          reveal_at?: string | null
          slug?: string
          theme?: string
          title?: string
          updated_at?: string
          youtube_video_id?: string | null
        }
        Update: {
          access_version?: number
          countdown_enabled?: boolean
          created_at?: string
          experience_enabled?: boolean
          id?: string
          letter?: string
          owner_id?: string
          password_enabled?: boolean
          password_hash?: string | null
          postcard_note?: string | null
          postcard_subject?: string | null
          published?: boolean
          recipient?: string
          reveal_at?: string | null
          slug?: string
          theme?: string
          title?: string
          updated_at?: string
          youtube_video_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_rate_limit: {
        Args: {
          p_bucket: string
          p_key: string
          p_limit: number
          p_lock_seconds: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          attempt_count: number
          locked_until: string | null
        }[]
      }
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
  public: {
    Enums: {},
  },
} as const
