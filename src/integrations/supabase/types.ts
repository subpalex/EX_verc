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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      market_photos: {
        Row: {
          area: string | null
          cleanliness_status:
            | Database["public"]["Enums"]["cleanliness_status"]
            | null
          created_at: string
          description: string | null
          flag_reason: string | null
          grade: number | null
          grade_reason: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_flagged: boolean | null
          is_verified: boolean | null
          market_name: string
          photo_url: string
          points_awarded: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          vendor_id: string
        }
        Insert: {
          area?: string | null
          cleanliness_status?:
            | Database["public"]["Enums"]["cleanliness_status"]
            | null
          created_at?: string
          description?: string | null
          flag_reason?: string | null
          grade?: number | null
          grade_reason?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_flagged?: boolean | null
          is_verified?: boolean | null
          market_name: string
          photo_url: string
          points_awarded?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          vendor_id: string
        }
        Update: {
          area?: string | null
          cleanliness_status?:
            | Database["public"]["Enums"]["cleanliness_status"]
            | null
          created_at?: string
          description?: string | null
          flag_reason?: string | null
          grade?: number | null
          grade_reason?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_flagged?: boolean | null
          is_verified?: boolean | null
          market_name?: string
          photo_url?: string
          points_awarded?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_photos_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_photos_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_streak: number | null
          full_name: string
          id: string
          is_disqualified: boolean | null
          market_name: string | null
          photo_count: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          vendor_rating: number | null
        }
        Insert: {
          created_at?: string
          current_streak?: number | null
          full_name: string
          id: string
          is_disqualified?: boolean | null
          market_name?: string | null
          photo_count?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          vendor_rating?: number | null
        }
        Update: {
          created_at?: string
          current_streak?: number | null
          full_name?: string
          id?: string
          is_disqualified?: boolean | null
          market_name?: string | null
          photo_count?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          vendor_rating?: number | null
        }
        Relationships: []
      }
      upload_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_name: string | null
          file_size: number | null
          id: string
          retry_count: number | null
          status: string
          storage_path: string | null
          upload_id: string
          vendor_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          retry_count?: number | null
          status: string
          storage_path?: string | null
          upload_id: string
          vendor_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          retry_count?: number | null
          status?: string
          storage_path?: string | null
          upload_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_logs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_rankings: {
        Row: {
          average_grade: number | null
          created_at: string
          id: string
          is_clean_vendor_of_week: boolean | null
          penalty_points: number | null
          photo_count: number
          rank: number | null
          streak_bonus: number | null
          total_grade_points: number | null
          total_points: number | null
          vendor_id: string
          verified_clean_count: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          average_grade?: number | null
          created_at?: string
          id?: string
          is_clean_vendor_of_week?: boolean | null
          penalty_points?: number | null
          photo_count?: number
          rank?: number | null
          streak_bonus?: number | null
          total_grade_points?: number | null
          total_points?: number | null
          vendor_id: string
          verified_clean_count?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          average_grade?: number | null
          created_at?: string
          id?: string
          is_clean_vendor_of_week?: boolean | null
          penalty_points?: number | null
          photo_count?: number
          rank?: number | null
          streak_bonus?: number | null
          total_grade_points?: number | null
          total_points?: number | null
          vendor_id?: string
          verified_clean_count?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_rankings_vendor_id_fkey"
            columns: ["vendor_id"]
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
      get_vendor_rankings: {
        Args: { p_week_end: string; p_week_start: string }
        Returns: {
          full_name: string
          market_name: string
          photo_count: number
          rank: number
          total_points: number
          vendor_id: string
          verified_clean_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_weekly_rankings: {
        Args: { p_week_end: string; p_week_start: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "vendor" | "officer" | "admin"
      cleanliness_status: "clean" | "needs_cleaning" | "overflowing"
      user_role: "vendor" | "officer" | "admin"
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
    Enums: {
      app_role: ["vendor", "officer", "admin"],
      cleanliness_status: ["clean", "needs_cleaning", "overflowing"],
      user_role: ["vendor", "officer", "admin"],
    },
  },
} as const
