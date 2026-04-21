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
      exercise_submissions: {
        Row: {
          answer: string | null
          coach_feedback: string | null
          created_at: string
          exercise_id: string
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          coach_feedback?: string | null
          created_at?: string
          exercise_id: string
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          coach_feedback?: string | null
          created_at?: string
          exercise_id?: string
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_submissions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string
          id: string
          instructions: string
          is_published: boolean
          level: Database["public"]["Enums"]["exercise_level"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          instructions: string
          is_published?: boolean
          level?: Database["public"]["Enums"]["exercise_level"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          instructions?: string
          is_published?: boolean
          level?: Database["public"]["Enums"]["exercise_level"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_note: string | null
          amount_fcfa: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          offer: Database["public"]["Enums"]["offer_type"]
          payer_phone: string | null
          proof_path: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_fcfa: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          offer: Database["public"]["Enums"]["offer_type"]
          payer_phone?: string | null
          proof_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_fcfa?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          offer?: Database["public"]["Enums"]["offer_type"]
          payer_phone?: string | null
          proof_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          initial_capital: number | null
          last_seen_at: string | null
          status: Database["public"]["Enums"]["account_status"]
          subscription_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          initial_capital?: number | null
          last_seen_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          subscription_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          initial_capital?: number | null
          last_seen_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          subscription_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          coach_feedback: string | null
          created_at: string
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_price: number | null
          error_tag: Database["public"]["Enums"]["error_tag"] | null
          exit_price: number | null
          fundamental_note: string | null
          id: string
          lot_size: number | null
          news_event: string | null
          news_impact: Database["public"]["Enums"]["news_impact"] | null
          pair: string
          result_usd: number | null
          screenshot_path: string | null
          sentiment: Database["public"]["Enums"]["sentiment"] | null
          source_link: string | null
          status: Database["public"]["Enums"]["trade_status"] | null
          stop_loss: number | null
          take_profit: number | null
          technical_comment: string | null
          trade_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_feedback?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_price?: number | null
          error_tag?: Database["public"]["Enums"]["error_tag"] | null
          exit_price?: number | null
          fundamental_note?: string | null
          id?: string
          lot_size?: number | null
          news_event?: string | null
          news_impact?: Database["public"]["Enums"]["news_impact"] | null
          pair: string
          result_usd?: number | null
          screenshot_path?: string | null
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          source_link?: string | null
          status?: Database["public"]["Enums"]["trade_status"] | null
          stop_loss?: number | null
          take_profit?: number | null
          technical_comment?: string | null
          trade_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_feedback?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["trade_direction"]
          entry_price?: number | null
          error_tag?: Database["public"]["Enums"]["error_tag"] | null
          exit_price?: number | null
          fundamental_note?: string | null
          id?: string
          lot_size?: number | null
          news_event?: string | null
          news_impact?: Database["public"]["Enums"]["news_impact"] | null
          pair?: string
          result_usd?: number | null
          screenshot_path?: string | null
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          source_link?: string | null
          status?: Database["public"]["Enums"]["trade_status"] | null
          stop_loss?: number | null
          take_profit?: number | null
          technical_comment?: string | null
          trade_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      weekly_analyses: {
        Row: {
          created_at: string
          created_by: string
          expected_direction: string | null
          id: string
          is_published: boolean
          key_news: string | null
          market_state: string | null
          title: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expected_direction?: string | null
          id?: string
          is_published?: boolean
          key_news?: string | null
          market_state?: string | null
          title: string
          updated_at?: string
          week_start?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expected_direction?: string | null
          id?: string
          is_published?: boolean
          key_news?: string | null
          market_state?: string | null
          title?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_status: "pending" | "active" | "expired"
      app_role: "admin" | "student" | "subscriber"
      error_tag: "bad_timing" | "overtrading" | "bad_analysis" | "none"
      exercise_level: "debutant" | "intermediaire" | "avance"
      news_impact: "high" | "medium" | "low" | "none"
      offer_type: "formation" | "sub_1m" | "sub_3m" | "sub_6m" | "sub_12m"
      payment_method: "mtn" | "orange" | "airtel"
      payment_status: "pending" | "approved" | "rejected"
      sentiment: "bullish" | "bearish" | "neutral"
      submission_status: "pending" | "submitted" | "graded"
      trade_direction: "buy" | "sell"
      trade_status: "win" | "loss" | "breakeven"
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
      account_status: ["pending", "active", "expired"],
      app_role: ["admin", "student", "subscriber"],
      error_tag: ["bad_timing", "overtrading", "bad_analysis", "none"],
      exercise_level: ["debutant", "intermediaire", "avance"],
      news_impact: ["high", "medium", "low", "none"],
      offer_type: ["formation", "sub_1m", "sub_3m", "sub_6m", "sub_12m"],
      payment_method: ["mtn", "orange", "airtel"],
      payment_status: ["pending", "approved", "rejected"],
      sentiment: ["bullish", "bearish", "neutral"],
      submission_status: ["pending", "submitted", "graded"],
      trade_direction: ["buy", "sell"],
      trade_status: ["win", "loss", "breakeven"],
    },
  },
} as const
