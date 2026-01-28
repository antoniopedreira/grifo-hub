/**
 * Tipos auxiliares para tabelas e entidades do Supabase
 * Este arquivo complementa o types.ts auto-gerado
 */

import type { Tables, Enums } from "@/integrations/supabase/types";

// ============= CRM TYPES =============

export type CrmQuarter = Enums<"crm_quarter">;
export type CrmHealth = Enums<"crm_health">;

export interface CrmJourney extends Tables<"crm_journeys"> {
  leads?: {
    full_name: string | null;
    email: string | null;
    company_revenue: number | null;
  } | null;
}

export type CrmChecklistItem = Tables<"crm_checklist_items">;
export type CrmChecklistTemplate = Tables<"crm_checklist_templates">;

// ============= DEAL COMMENTS =============

export interface DealComment {
  id: string;
  deal_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_email?: string;
}

// ============= TEAM MISSIONS =============

export type MissionStatus = Enums<"mission_status">;
export type TeamMission = Tables<"team_missions">;
export type TeamMember = Tables<"team_members">;

// Extended team mission - use Omit to override optional fields
export type TeamMissionWithSupport = TeamMission;

// ============= PRODUCTS =============

export type ProductFunnelType = Enums<"product_funnel_type">;

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

// --- NOVO: Interface Product com o campo do Pixel ---
export interface Product extends Tables<"products"> {
  meta_pixel_id?: string | null;
}

export interface ProductWithCategory extends Tables<"products"> {
  product_categories?: ProductCategory | null;
}

// ============= LEADS =============

export type Lead = Tables<"leads">;

// ============= PIPELINE =============

export type DealStatus = Enums<"deal_status">;
export type Deal = Tables<"deals">;
export type Pipeline = Tables<"pipelines">;
export type PipelineStage = Tables<"pipeline_stages">;
