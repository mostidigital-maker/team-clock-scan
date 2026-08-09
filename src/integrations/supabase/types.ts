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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          salt: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          salt: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          salt?: string
          username?: string
        }
        Relationships: []
      }
      app_sessions: {
        Row: {
          created_at: string
          employee_id: string | null
          expires_at: string
          kind: string
          token: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          expires_at: string
          kind: string
          token: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          expires_at?: string
          kind?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          entry_latitude: number | null
          entry_longitude: number | null
          entry_time: string | null
          exit_latitude: number | null
          exit_longitude: number | null
          exit_qr_code_id: string | null
          exit_time: string | null
          id: string
          qr_code_id: string | null
          status: string
          work_date: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          entry_latitude?: number | null
          entry_longitude?: number | null
          entry_time?: string | null
          exit_latitude?: number | null
          exit_longitude?: number | null
          exit_qr_code_id?: string | null
          exit_time?: string | null
          id?: string
          qr_code_id?: string | null
          status?: string
          work_date: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          entry_latitude?: number | null
          entry_longitude?: number | null
          entry_time?: string | null
          exit_latitude?: number | null
          exit_longitude?: number | null
          exit_qr_code_id?: string | null
          exit_time?: string | null
          id?: string
          qr_code_id?: string | null
          status?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_exit_qr_code_id_fkey"
            columns: ["exit_qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_breaks: {
        Row: {
          attendance_id: string
          created_at: string
          end_time: string | null
          id: string
          start_time: string
        }
        Insert: {
          attendance_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          start_time?: string
        }
        Update: {
          attendance_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_breaks_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_name: string
          id: boolean
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string
          id?: boolean
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          id?: boolean
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          active: boolean
          bonus: number
          created_at: string
          full_name: string
          hourly_wage: number
          id: string
          id_number: string
          travel: number
        }
        Insert: {
          active?: boolean
          bonus?: number
          created_at?: string
          full_name: string
          hourly_wage?: number
          id?: string
          id_number: string
          travel?: number
        }
        Update: {
          active?: boolean
          bonus?: number
          created_at?: string
          full_name?: string
          hourly_wage?: number
          id?: string
          id_number?: string
          travel?: number
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          token: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          token: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          token?: string
          valid_from?: string
          valid_until?: string
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
