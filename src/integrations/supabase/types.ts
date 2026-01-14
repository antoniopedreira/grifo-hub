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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      deals: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          pipeline_id: string | null
          priority: string | null
          product_id: string | null
          stage_id: string | null
          status: Database["public"]["Enums"]["deal_status"] | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          pipeline_id?: string | null
          priority?: string | null
          product_id?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"] | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          pipeline_id?: string | null
          priority?: string | null
          product_id?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"] | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          answers: Json
          id: string
          lead_id: string | null
          product_id: string | null
          submitted_at: string | null
        }
        Insert: {
          answers: Json
          id?: string
          lead_id?: string | null
          product_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          answers?: Json
          id?: string
          lead_id?: string | null
          product_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          ltv: number | null
          origin: string | null
          phone: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ltv?: number | null
          origin?: string | null
          phone?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ltv?: number | null
          origin?: string | null
          phone?: string | null
          status?: string | null
        }
        Relationships: []
      }
      marketing_links: {
        Row: {
          clicks_count: number | null
          created_at: string | null
          destination_url: string
          id: string
          slug: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          clicks_count?: number | null
          created_at?: string | null
          destination_url: string
          id?: string
          slug: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          clicks_count?: number | null
          created_at?: string | null
          destination_url?: string
          id?: string
          slug?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      page_templates: {
        Row: {
          component_key: string
          created_at: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["template_type"]
        }
        Insert: {
          component_key: string
          created_at?: string | null
          id?: string
          name: string
          type: Database["public"]["Enums"]["template_type"]
        }
        Update: {
          component_key?: string
          created_at?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["template_type"]
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          id: string
          name: string
          order_index: number
          pipeline_id: string | null
        }
        Insert: {
          id?: string
          name: string
          order_index: number
          pipeline_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          order_index?: number
          pipeline_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          category_id: string | null
          checkout_url: string | null
          create_deal: boolean | null
          created_at: string | null
          external_id: string | null
          funnel_type: Database["public"]["Enums"]["product_funnel_type"] | null
          id: string
          name: string
          price: number | null
          slug: string | null
          template_id: string | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          checkout_url?: string | null
          create_deal?: boolean | null
          created_at?: string | null
          external_id?: string | null
          funnel_type?:
            | Database["public"]["Enums"]["product_funnel_type"]
            | null
          id?: string
          name: string
          price?: number | null
          slug?: string | null
          template_id?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          checkout_url?: string | null
          create_deal?: boolean | null
          created_at?: string | null
          external_id?: string | null
          funnel_type?:
            | Database["public"]["Enums"]["product_funnel_type"]
            | null
          id?: string
          name?: string
          price?: number | null
          slug?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "page_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          id: string
          lead_id: string | null
          origin: Database["public"]["Enums"]["sale_origin"]
          product_name: string | null
          transaction_date: string | null
        }
        Insert: {
          amount: number
          id?: string
          lead_id?: string | null
          origin: Database["public"]["Enums"]["sale_origin"]
          product_name?: string | null
          transaction_date?: string | null
        }
        Update: {
          amount?: number
          id?: string
          lead_id?: string | null
          origin?: Database["public"]["Enums"]["sale_origin"]
          product_name?: string | null
          transaction_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      team_missions: {
        Row: {
          created_at: string | null
          deadline: string | null
          department: string | null
          id: string
          mission: string
          notes: string | null
          owner_id: string | null
          status: Database["public"]["Enums"]["mission_status"] | null
          support_id: string | null
          target_goal: string | null
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          department?: string | null
          id?: string
          mission: string
          notes?: string | null
          owner_id?: string | null
          status?: Database["public"]["Enums"]["mission_status"] | null
          support_id?: string | null
          target_goal?: string | null
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          department?: string | null
          id?: string
          mission?: string
          notes?: string | null
          owner_id?: string | null
          status?: Database["public"]["Enums"]["mission_status"] | null
          support_id?: string | null
          target_goal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_missions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_missions_support_id_fkey"
            columns: ["support_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_sale: {
        Args: {
          p_amount: number
          p_email: string
          p_name: string
          p_phone: string
          p_product_external_id: string
          p_transaction_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      deal_status: "open" | "won" | "lost" | "abandoned"
      mission_status:
        | "Pendente"
        | "Em Andamento"
        | "Em Revisão"
        | "Concluído"
        | "Stand-by"
      product_funnel_type: "external_link" | "internal_form"
      sale_origin: "lastlink_auto" | "crm_manual"
      template_type: "landing_page" | "application_form"
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
      deal_status: ["open", "won", "lost", "abandoned"],
      mission_status: [
        "Pendente",
        "Em Andamento",
        "Em Revisão",
        "Concluído",
        "Stand-by",
      ],
      product_funnel_type: ["external_link", "internal_form"],
      sale_origin: ["lastlink_auto", "crm_manual"],
      template_type: ["landing_page", "application_form"],
    },
  },
} as const
