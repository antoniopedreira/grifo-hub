export interface Deal {
  id: string;
  title: string;
  value: number;
  company_name?: string;
  status: "open" | "won" | "lost" | "abandoned" | "archived";
  created_at: string;
  pipeline_id?: string;
  stage_id: string;
  order_index?: number;
  meeting_date?: string;
  lead_id?: string;
  product_id?: string;
  description?: string;
  priority?: "Low" | "Medium" | "High";
  loss_reason?: string | null;

  meeting_owner_id?: string | null;

  lead?: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    ltv?: number;
  } | null;

  product?: {
    id: string;
    name: string;
    price: number;
  } | null;

  meeting_owner?: {
    id: string;
    name: string;
  } | null;
}

export interface PipelineStage {
  id: string;
  name: string;
  pipeline_id: string;
  order_index: number;
  type?: "default" | "meeting" | "won" | "lost" | "negotiation";
}

export interface Pipeline {
  id: string;
  name: string;
  created_at?: string;
  archived?: boolean;
}

export interface FormSubmission {
  id: string;
  created_at: string;
  form_data: Record<string, any>;
}
