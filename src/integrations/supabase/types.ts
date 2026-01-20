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
      crm_checklist_items: {
        Row: {
          attachment_url: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          file_url: string | null
          id: string
          journey_id: string | null
          observations: string | null
          order_index: number | null
          quarter: Database["public"]["Enums"]["crm_quarter"]
          status: string | null
          title: string
        }
        Insert: {
          attachment_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          journey_id?: string | null
          observations?: string | null
          order_index?: number | null
          quarter: Database["public"]["Enums"]["crm_quarter"]
          status?: string | null
          title: string
        }
        Update: {
          attachment_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          journey_id?: string | null
          observations?: string | null
          order_index?: number | null
          quarter?: Database["public"]["Enums"]["crm_quarter"]
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_checklist_items_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "crm_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_checklist_templates: {
        Row: {
          created_at: string | null
          id: string
          order_index: number
          quarter: Database["public"]["Enums"]["crm_quarter"]
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_index?: number
          quarter: Database["public"]["Enums"]["crm_quarter"]
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_index?: number
          quarter?: Database["public"]["Enums"]["crm_quarter"]
          title?: string
        }
        Relationships: []
      }
      crm_journeys: {
        Row: {
          created_at: string | null
          current_quarter: Database["public"]["Enums"]["crm_quarter"] | null
          cx_owner: string | null
          general_notes: string | null
          health_status: Database["public"]["Enums"]["crm_health"] | null
          id: string
          lead_id: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_quarter?: Database["public"]["Enums"]["crm_quarter"] | null
          cx_owner?: string | null
          general_notes?: string | null
          health_status?: Database["public"]["Enums"]["crm_health"] | null
          id?: string
          lead_id?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_quarter?: Database["public"]["Enums"]["crm_quarter"] | null
          cx_owner?: string | null
          general_notes?: string | null
          health_status?: Database["public"]["Enums"]["crm_health"] | null
          id?: string
          lead_id?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_journeys_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          meeting_date: string | null
          meeting_owner_id: string | null
          order_index: number | null
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
          meeting_date?: string | null
          meeting_owner_id?: string | null
          order_index?: number | null
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
          meeting_date?: string | null
          meeting_owner_id?: string | null
          order_index?: number | null
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
            foreignKeyName: "deals_meeting_owner_id_fkey"
            columns: ["meeting_owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
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
          company_revenue: number | null
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
          company_revenue?: number | null
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
          company_revenue?: number | null
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
          type: string | null
        }
        Insert: {
          id?: string
          name: string
          order_index: number
          pipeline_id?: string | null
          type?: string | null
        }
        Update: {
          id?: string
          name?: string
          order_index?: number
          pipeline_id?: string | null
          type?: string | null
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
          archived: boolean | null
          id: string
          name: string
        }
        Insert: {
          archived?: boolean | null
          id?: string
          name: string
        }
        Update: {
          archived?: boolean | null
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
          is_crm_trigger: boolean | null
          name: string
          pipeline_id: string | null
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
          is_crm_trigger?: boolean | null
          name: string
          pipeline_id?: string | null
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
          is_crm_trigger?: boolean | null
          name?: string
          pipeline_id?: string | null
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
            foreignKeyName: "products_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
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
          product_id: string | null
          product_name: string | null
          transaction_date: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          id?: string
          lead_id?: string | null
          origin: Database["public"]["Enums"]["sale_origin"]
          product_id?: string | null
          product_name?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          id?: string
          lead_id?: string | null
          origin?: Database["public"]["Enums"]["sale_origin"]
          product_id?: string | null
          product_name?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          is_recurring: boolean | null
          mission: string
          notes: string | null
          order_index: number | null
          owner_id: string | null
          parent_mission_id: string | null
          recurrence_day: number | null
          recurrence_type: string | null
          status: Database["public"]["Enums"]["mission_status"] | null
          support_id: string | null
          support_ids: string[] | null
          target_goal: string | null
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          department?: string | null
          id?: string
          is_recurring?: boolean | null
          mission: string
          notes?: string | null
          order_index?: number | null
          owner_id?: string | null
          parent_mission_id?: string | null
          recurrence_day?: number | null
          recurrence_type?: string | null
          status?: Database["public"]["Enums"]["mission_status"] | null
          support_id?: string | null
          support_ids?: string[] | null
          target_goal?: string | null
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          department?: string | null
          id?: string
          is_recurring?: boolean | null
          mission?: string
          notes?: string | null
          order_index?: number | null
          owner_id?: string | null
          parent_mission_id?: string | null
          recurrence_day?: number | null
          recurrence_type?: string | null
          status?: Database["public"]["Enums"]["mission_status"] | null
          support_id?: string | null
          support_ids?: string[] | null
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
            foreignKeyName: "team_missions_parent_mission_id_fkey"
            columns: ["parent_mission_id"]
            isOneToOne: false
            referencedRelation: "team_missions"
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
      convert_deal_to_sale: {
        Args: { p_amount: number; p_deal_id: string; p_product_id: string }
        Returns: Json
      }
      handle_churn_refund: {
        Args: {
          p_email: string
          p_event_type: string
          p_transaction_id?: string
        }
        Returns: Json
      }
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
      handle_recovery_deal:
        | {
            Args: {
              p_email: string
              p_event_type: string
              p_name: string
              p_offer_name: string
              p_offer_url: string
              p_offer_value: number
              p_phone: string
              p_product_external_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_email: string
              p_event_type: string
              p_name: string
              p_offer_name: string
              p_offer_url: string
              p_offer_value: number
              p_phone: string
              p_product_external_id?: string
              p_product_uuid?: string
            }
            Returns: Json
          }
    }
    Enums: {
      crm_health: "active" | "warning" | "risk"
      crm_quarter: "Q1" | "Q2" | "Q3" | "Q4"
      deal_status: "open" | "won" | "lost" | "abandoned" | "archived"
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
      crm_health: ["active", "warning", "risk"],
      crm_quarter: ["Q1", "Q2", "Q3", "Q4"],
      deal_status: ["open", "won", "lost", "abandoned", "archived"],
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
