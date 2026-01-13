import type { Tables } from "@/integrations/supabase/types";

export type Deal = Tables<"deals"> & {
  lead: Tables<"leads"> | null;
  product: Tables<"products"> | null;
};

export type Stage = Tables<"pipeline_stages">;
export type Pipeline = Tables<"pipelines">;
export type Lead = Tables<"leads">;
export type Product = Tables<"products">;
export type FormSubmission = Tables<"form_submissions">;

export interface KanbanColumn {
  stage: Stage;
  deals: Deal[];
}
