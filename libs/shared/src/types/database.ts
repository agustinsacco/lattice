export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      credit_transactions: {
        Row: {
          amount: number
          base_cost: number | null
          created_at: string | null
          description: string | null
          id: string
          input_tokens: number | null
          margin: number | null
          message_id: string | null
          model: string | null
          output_tokens: number | null
          session_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          base_cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          input_tokens?: number | null
          margin?: number | null
          message_id?: string | null
          model?: string | null
          output_tokens?: number | null
          session_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          base_cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          input_tokens?: number | null
          margin?: number | null
          message_id?: string | null
          model?: string | null
          output_tokens?: number | null
          session_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          id: string
          role: string
          session_id: string | null
          timestamp: string | null
          token_usage: Json | null
          tool_input: Json | null
          tool_name: string | null
          tool_output: Json | null
          type: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          id?: string
          role: string
          session_id?: string | null
          timestamp?: string | null
          token_usage?: Json | null
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
          type?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          id?: string
          role?: string
          session_id?: string | null
          timestamp?: string | null
          token_usage?: Json | null
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_versions: {
        Row: {
          created_at: string
          id: string
          session_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdf_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          cost_usd: number
          created_at: string | null
          credits_used: number
          id: string
          name: string
          conversation_log: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string | null
          credits_used?: number
          id?: string
          name: string
          conversation_log?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string | null
          credits_used?: number
          id?: string
          name?: string
          conversation_log?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signatures: {
        Row: {
          created_at: string | null
          id: string
          image_data: string
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_data: string
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_data?: string
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string | null
          daily_credits_last_reset: string | null
          has_received_welcome_credits: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          daily_credits_last_reset?: string | null
          has_received_welcome_credits?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          daily_credits_last_reset?: string | null
          has_received_welcome_credits?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_memory: {
        Row: {
          category: string
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          user_id: string
          value: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          user_id: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          user_id?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      grant_welcome_credits: { Args: { user_id_arg: string }; Returns: boolean }
      increment_session_cost:
        | {
            Args: { cost_increment: number; session_id_arg: string }
            Returns: undefined
          }
        | {
            Args: {
              cost_increment: number
              credits_increment: number
              session_id_arg: string
            }
            Returns: undefined
          }
      increment_user_credits: {
        Args: {
          amount_arg: number
          base_cost_arg?: number
          description_arg?: string
          input_tokens_arg?: number
          margin_arg?: number
          message_id_arg?: string
          model_arg?: string
          output_tokens_arg?: number
          session_id_arg?: string
          transaction_type_arg: string
          user_id_arg: string
        }
        Returns: undefined
      }
      increment_user_credits_v2: {
        Args: {
          amount_arg: number
          base_cost_arg?: number
          description_arg?: string
          enforce_balance?: boolean
          input_tokens_arg?: number
          margin_arg?: number
          message_id_arg?: string
          model_arg?: string
          output_tokens_arg?: number
          session_id_arg?: string
          transaction_type_arg: string
          user_id_arg: string
        }
        Returns: boolean
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

